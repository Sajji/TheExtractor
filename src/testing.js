async function getGraphQLData(baseDirectory) {
  console.log(baseDirectory);
  try {
    const domainList = require(path.join(baseDirectory, 'domains.json'));

    // ... (rest of your code)

    // Replace this line with one that writes to baseDirectory
    const domainDataPath = path.join(baseDirectory, `assets_${domain.name}.json`);

    // ... (rest of your code)

  } catch (error) {
    console.error(error);
  }
}

// ... (rest of your code)
