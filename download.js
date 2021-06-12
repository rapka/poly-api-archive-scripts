const path = require('path');
const _ = require('lodash');
const { google } = require('googleapis');
const fs = require('fs');
const axios = require('axios');
var mkdirp = require('mkdirp');

const downloadFile = async (fileUrl, directoryName, fileName) => {
	const filePath = path.join(__dirname, 'downloads', directoryName, fileName);
	await mkdirp(path.dirname(filePath));

	const writer = fs.createWriteStream(filePath);

	return axios({
	  method: 'get',
	  url: fileUrl,
	  responseType: 'stream',
	}).then(response => {
		return new Promise((resolve, reject) => {
			response.data.pipe(writer);
			let error = null;

			writer.on('error', err => {
				error = err;
				writer.close();
				reject(err);
			});

			writer.on('close', () => {
				if (!error) {
				  resolve(true);
				}
			});
		});
	});
}


const main = async () => {
	const filename = process.argv[3] || 'assets.json';
  const keyFileName = process.argv[2];

	const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, keyFileName),
	  scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/vrassetdata.readonly'],
	});

	const list = JSON.parse(fs.readFileSync(path.join(__dirname, `${filename}.json`)));

	// set auth as a global default
	google.options({ auth });

	const poly = google.poly({
	  version: 'v1',
	  auth,
	});

	console.log(`Downloading ${list.length} assets.`);

	for (const asset of list) {
		const folderName = asset.name.replace('assets/', '');

		console.log(`downloading asset id: ${folderName} name: ${asset.displayName} author: ${asset.author}`);
		const folderPath = path.join(__dirname, 'downloads', folderName);

		fs.mkdirSync(folderPath, { recursive: true });
		fs.writeFileSync(path.join(folderPath, 'info.json'), JSON.stringify(asset, null, 2));

		if (asset.thumbnail) {
			try {
				await downloadFile(asset.thumbnail.url, folderName, asset.thumbnail.relativePath);
			} catch (err) {
				console.error('Thumbnail download error', err);
			}
		}

		for (const format of asset.formats) {
				if (format.root) {
					try {
						await downloadFile(format.root.url, folderName, format.root.relativePath);
					} catch (err) {
						console.error('Root download error: ', err);
					}
				}

				if (format.resources) {
					for (const resource of format.resources) {
						try {
							await downloadFile(resource.url, folderName, resource.relativePath);
						} catch (err) {
							console.error('Resource download error: ', err);
						}
					}
				}
			}
  	}
};

try {
	main();
} catch (err) {
	console.error('Error:', err);
}
