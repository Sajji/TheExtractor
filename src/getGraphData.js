const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const config = require('../config.json');
const fsPromises = require('fs').promises;
const fsSync = require('fs');

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
      displayName: displayName
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
    const rawData = await fsPromises.readFile(domainFilePath, 'utf8');
    const domainList = JSON.parse(rawData);



    for (const domain of domainList) {
      console.log(domain.name);
      const allData = [];
      // Initialize unique sets
      const uniqueAssets = new Set();
      const uniqueAttributes = new Set();
      const uniqueRelations = new Set();
      const uniqueTags = new Set();
      const responseData = await fetchGraphQLData(domain.id);
      if (!responseData) {
        continue;
      }

      responseData.forEach(asset => {
        const assetData = {
          id: asset.id,
          name: asset.name,
          displayName: asset.displayName,
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

          uniqueAssets.add(JSON.stringify(assetData));
          attributes.forEach(attr => uniqueAttributes.add(JSON.stringify(attr)));
          relations.forEach(rel => uniqueRelations.add(JSON.stringify(rel)));
          asset.tags.forEach(tag => uniqueTags.add(JSON.stringify(tag)));
      
      });

      const assetsDomainPath = path.join(baseDirectory, `assets_${domain.name}.json`);
      const allAssetsOutput = JSON.stringify([...uniqueAssets].map(JSON.parse), null, 2);
      fsSync.writeFileSync(assetsDomainPath, allAssetsOutput);

      const attributesDomainPath = path.join(baseDirectory, `attributes_${domain.name}.json`);
      const allAttributesOutput = JSON.stringify([...uniqueAttributes].map(JSON.parse), null, 2);
      fsSync.writeFileSync(attributesDomainPath, allAttributesOutput);

      const relationsDomainPath = path.join(baseDirectory, `relations_${domain.name}.json`);
      const allRelationsOutput = JSON.stringify([...uniqueRelations].map(JSON.parse), null, 2);
      fsSync.writeFileSync(relationsDomainPath, allRelationsOutput);

      if (uniqueTags.size > 0) {
      const tagsDomainPath = path.join(baseDirectory, `tags_${domain.name}.json`);
      const allTagsOutput = JSON.stringify([...uniqueTags].map(JSON.parse), null, 2);
      fsSync.writeFileSync(tagsDomainPath, allTagsOutput);
      console.log(`Data saved to ${tagsDomainPath}. Total Tags: ${allTagsOutput.length}`);
      }
      else {
        console.log(`No tags found for ${domain.name}`);
      }
      // console.log(`Data saved to ${assetsDomainPath}. Total assets: ${allData.length}`);
    }
        //Write unique attributes, relations, and tags to respective files
        // const assetsPath = path.join(baseDirectory, 'assets.json');
        // const attributesPath = path.join(baseDirectory, 'attributes.json');
        // const relationsPath = path.join(baseDirectory, 'relations.json');
        // const tagsPath = path.join(baseDirectory, 'tags.json');
    
        // await fsPromises.writeFile(assetsPath, JSON.stringify([...uniqueAssets].map(JSON.parse), null, 2));
        // await fsPromises.writeFile(attributesPath, JSON.stringify([...uniqueAttributes].map(JSON.parse), null, 2));
        // await fsPromises.writeFile(relationsPath, JSON.stringify([...uniqueRelations].map(JSON.parse), null, 2));
        // await fsPromises.writeFile(tagsPath, JSON.stringify([...uniqueTags].map(JSON.parse), null, 2));

  } catch (error) {
    console.error(error);
  }
}

module.exports = getGraphQLData;