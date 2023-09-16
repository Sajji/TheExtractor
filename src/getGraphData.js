const axios = require('axios');
const fs = require('fs').promises;  // Note the ".promises"
const path = require('path');
const config = require('../config.json');
const fsPromises = require('fs').promises;
const fsSync = require('fs');

// ... (rest of your code remains the same)


const sourceSystem = config.sourceSystem;

async function fetchGraphQLData(domainId) {
  const endpoint = sourceSystem.baseGraphql;
  const username = sourceSystem.username;
  const password = sourceSystem.password;

  const query = `
  query {
    assets(
      where: { domain: { id: { eq: "${domainId}" } } }
      limit: -1
    ) {
      id
      name: fullName
      type {
        id
        name
      }
      domain {
        id
        name
        parent {
          id
          name
        }
      }
      stringAttributes(limit: -1) {
        id
        type {
          id
          name
        }
        stringValue
      }
      numericAttributes(limit: -1) {
        id
        type {
          id
          name
        }
        numericValue
      }
      multiValueAttributes(limit: -1) {
        id
        type {
          id
          name
        }
        stringValues
      }
      dateAttributes(limit: -1) {
        id
        type {
          id
          name
        }
        dateValue
      }
      booleanAttributes(limit: -1) {
        id
        type {
          id
          name
        }
        booleanValue
      }
  
      outgoingRelations(limit: -1) {
        id
        type {
          id
        }
        source {
          id
          fullName
        }
        target {
          id
          fullName
        }
      }
      incomingRelations(limit: -1) {
        id
        type {
          id
        }
        source {
          id
          fullName
        }
        target {
          id
          fullName
        }
      }
      tags(limit: -1) {
        id
        name
      }
    }
  }
  
  `;

  try {
    const response = await axios.post(endpoint, { query }, {
      auth: {
        username,
        password
      }
    });

    const responseData = response.data.data.assets;
    return responseData;
  } catch (error) {
    console.error('GraphQL request failed:', error);
    return null;
  }
}

async function getGraphQLData(baseDirectory) {
  console.log(baseDirectory);

  try {
    const domainFilePath = path.join(baseDirectory, 'domains.json');
    console.log("Attempting to load JSON from:", domainFilePath);
    const rawData = await fsPromises.readFile(domainFilePath, 'utf8');  // Asynchronous read
    const domainList = JSON.parse(rawData);

    for (const domain of domainList) {
      console.log(domain.name);
      const allData = [];
      const responseData = await fetchGraphQLData(domain.id);
      if (!responseData) {
        continue;
      }

      responseData.forEach(asset => {
        const assetData = {
          id: asset.id,
          name: asset.name,
          domainId: asset.domain.id,
          domainName: asset.domain.name,
          typeId: asset.type.id,
          typeName: asset.type.name
        };

        const processAttributes = (attributes, valueType) => {
          return attributes.map(attribute => {
            return {
              assetId: asset.id,
              id: attribute.id,
              typeId: attribute.type.id,
              name: attribute.type.name,
              [valueType]: attribute[valueType]
            };
          });
        };

        const attributes = [
          ...processAttributes(asset.stringAttributes, 'stringValue'),
          ...processAttributes(asset.numericAttributes, 'numericValue'),
          ...processAttributes(asset.multiValueAttributes, 'stringValues'),
          ...processAttributes(asset.dateAttributes, 'dateValue'),
          ...processAttributes(asset.booleanAttributes, 'booleanValue')
        ];
  
        const relations = [
          ...asset.outgoingRelations,
          ...asset.incomingRelations,
        ].map(relation => ({
          relationId: relation.id,
          relationType: relation.type.id,
          sourceId: relation.source.id,
          sourceName: relation.source.fullName,
          targetId: relation.target.id,
          targetName: relation.target.fullName,
        }));
  
        allData.push({
          ...assetData,
          attributes,
          relations,
          tags: asset.tags,});
      });

      // Write the data to separate files for each domain
      const domainDataPath = path.join(baseDirectory, `assets_${domain.name}.json`);

      const allDataOutput = JSON.stringify(allData, null, 2);

      fsSync.writeFileSync(domainDataPath, allDataOutput); // Synchronous write

      console.log(`Data saved to ${domainDataPath}. Total assets: ${allData.length}`);
    }
  } catch (error) {
    console.error(error);
  }
}

module.exports = getGraphQLData;

