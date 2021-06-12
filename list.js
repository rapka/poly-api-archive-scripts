const path = require('path');
const _ = require('lodash');
const fs = require('fs');
const { google } = require('googleapis');

const main = async () => {
  const filename = process.argv[3] || 'assets.json';
  const curated = process.argv[4] === '--curated';
  const keyFileName = process.argv[2];

  console.log(`Using auth: ${keyFileName}. Downloading to ${filename}. Curated flag: ${curated}`);

  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, keyFileName),
    scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/vrassetdata.readonly'],
  });

  let currentPage = 0;

  // set auth as a global default
  google.options({ auth });

  const poly = google.poly({
    version: 'v1',
    auth,
  });

  let allAssets = [];

  let list = await poly.assets.list({
  	pageSize: 50,
  });

  let nextToken = _.get(list, 'data.nextPageToken');

  while (nextToken) {
    currentPage++;
    console.log(`Getting page ${currentPage}`);
  	allAssets = allAssets.concat(list.data.assets);

  	list = await poly.assets.list({
  		pageSize: 50,
  		pageToken: nextToken,
      curated,
  	});
  	nextToken = _.get(list, 'data.nextPageToken');

    // rate limit
  	await new Promise(resolve => setTimeout(resolve, 100));
  }

  fs.writeFileSync(path.join(__dirname, filename), JSON.stringify(allAssets, null, 2));
};

try {
	main();
} catch (err) {
	console.error('Error:', err);
}
