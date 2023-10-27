const axios = require('axios');
const fs = require('fs');
const readline = require('readline');
const path = require('path');
const config = require('../config.json');
const getGraphQLData = require('./getGraphData');
const getTypes = require('./getTypes');
const fetchDomains = require('./fetchDomains');
const generateSummary = require('./summary');  // Adjust './summary' if your file is located elsewhere.


const suffix = config.sourceSystem.suffix;

async function ensureDirectoryExistence(directoryPath) {
  try {
    await fs.promises.access(directoryPath, fs.constants.F_OK);
  } catch (e) {
    await fs.promises.mkdir(directoryPath, { recursive: true });
  }
}

// Function to write data to a file
const writeFileAsync = async (filePath, data) => {
  await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
};


async function fetchCommunityChildren(parentId, communityData = []) {
  const baseREST = config.sourceSystem.baseREST;
  const endpoint = `${baseREST}communities?parentId=${encodeURIComponent(parentId)}`;
  //console.log(`Fetching child communities for parent ID: ${parentId}`);

  try {
    const response = await axios.get(endpoint, {
      auth: {
        username: config.sourceSystem.username,
        password: config.sourceSystem.password,
      },
    });

    const responseData = response.data;

    if (responseData.total === 0) {
      //console.log(`No child communities found for parent ID: ${parentId}`);
      return;
    }

    for (const community of responseData.results) {
      const mappings = {
        id: community.id,
        name: community.name,
        newName: `${community.name} - ${suffix}`,
        parentId: community.parent.id,
        parentName: community.parent.name,
      };
  
      if (community.description !== undefined) {
        mappings.description = community.description;
      }
  
      communityData.push(mappings);
      await fetchCommunityChildren(community.id, communityData);  // Recursive call
    }

  } catch (error) {
    console.error(`GET request for child communities of ${parentId} failed:`, error);
  }
}

async function getCommunitiesDomains() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('Enter the destination base directory for saving data (default is ./backupData/): ', async (userInput) => {
    const baseDirectory = userInput || './backupData';

    // Ensure the base directory exists
    await ensureDirectoryExistence(baseDirectory);

    // File paths for saving communities and domains data
    const communitiesFilePath = path.join(baseDirectory, 'communities.json');
    const domainsFilePath = path.join(baseDirectory, 'domains.json');

    const baseREST = config.sourceSystem.baseREST;
    const communities = config.sourceSystem.communities;
    const communityData = [];
    const domainsData = [];
  

  for (const communityName of communities) {
    const endpoint = `${baseREST}communities?name=${encodeURIComponent(communityName)}&nameMatchMode=EXACT`;
    console.log(`Fetching data for community: ${communityName}`);

    try {
      const response = await axios.get(endpoint, {
        auth: {
          username: config.sourceSystem.username,
          password: config.sourceSystem.password,
        },
      });

      const responseData = response.data;

      if (!responseData.results || !responseData.results[0]) {
        console.error(`No community found for ${communityName}`);
        continue;
      }

      const community = responseData.results[0];
      const mappings = {
        id: community.id,
        name: community.name,
        newName: `${community.name} - ${suffix}`
      };
  
      if (community.description !== undefined) {
        mappings.description = community.description;
      }
  
      communityData.push(mappings);
      const domainsForCommunity = await fetchDomains(community.id);
      domainsData.push(...domainsForCommunity);

      await fetchCommunityChildren(community.id, communityData);  // Trigger the recursive function
    } catch (error) {
      console.error(`GET request for community ${communityName} failed:`, error);
    }
  }
  console.log(`Total communities: ${communityData.length}`);
  //console.log(domainsData);
  try {
    await writeFileAsync(communitiesFilePath, communityData);
    console.log(`Communities data successfully saved to ${communitiesFilePath}`);
  } catch (err) {
    console.error('Error while writing communities to file:', err);
  }

  try {
    await writeFileAsync(domainsFilePath, domainsData);
    console.log(`Domains data successfully saved to ${domainsFilePath}`);
    await getGraphQLData(baseDirectory);  // Pass baseDirectory here

    const backupDataDirectory = path.resolve(baseDirectory); // if baseDirectory is your directory for JSON files
    await generateSummary(backupDataDirectory);

    console.log('Summary generation complete.');


  } catch (err) {
    console.error('Error while writing domains to file:', err);
  }

  rl.close();
  getTypes();
  });

}

getCommunitiesDomains();