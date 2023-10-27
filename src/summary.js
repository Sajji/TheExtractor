const fs = require('fs').promises;
const path = require('path');

async function generateSummary(directoryPath) {
  try {
    // Read the content of the directory
    const files = await fs.readdir(directoryPath);

    // Filter JSON files that start with 'assets_'
    const assetFiles = files.filter(file => file.startsWith('assets_') && file.endsWith('.json'));

    let totalAssets = 0;
    let totalAttributes = 0;
    let totalRelations = 0;
    let totalTags = 0;

    // Process each file
    for (const file of assetFiles) {
      const filePath = path.join(directoryPath, file);

      // Read and parse file content
      const content = await fs.readFile(filePath, 'utf-8');
      const assets = JSON.parse(content);

      // Accumulate the counts
      for (const asset of assets) {
        totalAssets += 'id' in asset ? 1 : 0;
        totalAttributes += asset.attributes ? asset.attributes.length : 0;
        totalRelations += asset.relations ? asset.relations.length : 0;
        totalTags += asset.tags ? asset.tags.length : 0;
      }
    }

    // Build the summary object
    const summary = {
      totalAssets,
      totalAttributes,
      totalRelations,
      totalTags,
    };

    // Create the summary file
    const summaryPath = path.join(directoryPath, 'summary.json');
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf-8');

    console.log('Summary generated successfully:', summary);
  } catch (error) {
    console.error('An error occurred while generating summary:', error);
  }
}

// Usage
//const backupDataDirectory = './backupData'; // please replace with your actual directory path
//generateSummary(backupDataDirectory);
module.exports = generateSummary;