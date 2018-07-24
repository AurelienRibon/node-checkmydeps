'use strict';

const https = require('https');

exports.fetchLatestVersionFromGithubPackage = async function(repo, token) {
  const parts = repo.split(/[/#]/);

  if (parts.length < 2) {
    throw new Error(`Invalid github repository: "${repo}"`);
  }

  if (parts.length === 2) {
    parts.push('master');
  }

  const path = parts.join('/');
  const date = new Date().getTime();
  const options = {
    hostname: 'raw.githubusercontent.com',
    path: `/${path}/package.json?nocache=${date}`,
    headers: {}
  };

  if (token) {
    options.headers.Authorization = `token ${token}`;
  }

  return new Promise((resolve, reject) => {
    const request = https.get(options, res => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Github returned status ${res.statusCode} for dependency "${repo}".`));
      }

      let content = '';

      res.on('data', chunk => {
        content += chunk.toString();
      });

      res.on('end', () => {
        let version;
        try {
          version = JSON.parse(content).version;
        } catch (err) {
          return reject(err);
        }
        return resolve(version);
      });
    });

    request.on('error', reject);
  });
};
