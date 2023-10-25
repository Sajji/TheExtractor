const axios = require('axios');
const config = require('../config.json');


async function fetchDomains(communityId) {
  const baseREST = config.sourceSystem.baseREST;
  const suffix = config.sourceSystem.suffix;
  const endpoint = `${baseREST}domains?offset=0&limit=0&countLimit=-1&communityId=${communityId}&includeSubCommunities=true`;

  try {
    const response = await axios.get(endpoint, {
      auth: {
        username: config.sourceSystem.username,
        password: config.sourceSystem.password,
      },
    });

    const responseData = response.data.results;

    // Map over the response data to format it as you wish
    const formattedData = responseData.map(domain => {
      const formattedDomain = {
        id: domain.id,
        name: domain.name,
        newName: `${domain.name} - ${suffix}`,
        typeId: domain.type.id,
        typeName: domain.type.name,
        communityId: domain.community.id,
        communityName: domain.community.name,
      };
      
      if (domain.description !== undefined) {
        formattedDomain.description = domain.description;
      }

      return formattedDomain;
    });

    return formattedData;
  } catch (error) {
    console.error(`GET request for domains of community ID ${communityId} failed:`, error);
    return [];
  }
}

module.exports = fetchDomains;
