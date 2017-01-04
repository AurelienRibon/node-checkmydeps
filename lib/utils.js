'use strict';

const https = require('https');

exports.downloadGithubPackage = function(repo, token, done) {
  const parts = repo.split(/[\/#]/);

  if (parts.length < 2) {
    return done(new Error(`Invalid github repository: "${repo}"`));
  }

  if (parts.length === 2) {
    parts.push('master');
  }

  const path    = parts.join('/');
  const request = {
    hostname : 'raw.githubusercontent.com',
    path     : `/${path}/package.json`,
    headers  : {}
  };

  if (token) {
    request.headers.Authorization = `token ${token}`;
  }

  https.get(request, res => {
    if (res.statusCode !== 200) {
      return done(new Error(`Github returned status ${res.statusCode} for repo "${repo}"`));
    }

    let content = '';

    res.on('data', chunk => {
      content += chunk.toString();
    });

    res.on('end', () => {
      let json;
      try {
        json = JSON.parse(content);
      } catch (err) {
        return done(err);
      }
      return done(null, json);
    });

  }).on('error', done);
};
