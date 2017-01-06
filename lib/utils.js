'use strict';

const https = require('https');

exports.createReportTable = function(deps) {
  let table = '';

  for (const { name, found, needs, type } of deps) {
    let needs2 = needs;
    if (type === 'github') { needs2 += ' (on github)'; }

    table += `${name}|needs ${needs2}|found ${found}\n`;
  }

  return exports.formatReportTable(table.trim());
};

exports.formatReportTable = function(text) {
  const lines       = text.split('\n');
  let maxLenghtCol1 = 0;
  let maxLenghtCol2 = 0;

  for (const line of lines) {
    const idxSeparator1 = line.indexOf('|');
    if (idxSeparator1 === -1) { continue; }
    maxLenghtCol1 = Math.max(maxLenghtCol1, idxSeparator1);

    const idxSeparator2 = line.indexOf('|', idxSeparator1 + 1);
    if (idxSeparator2 === -1) { continue; }
    maxLenghtCol2 = Math.max(maxLenghtCol2, idxSeparator2 - idxSeparator1 - 1);
  }

  for (let i = 0; i < lines.length; ++i) {
    const parts = lines[i].split('|');
    if (parts.length !== 3) { continue; }

    const filler1 = new Array(maxLenghtCol1 - parts[0].length + 1).join(' ');
    const filler2 = new Array(maxLenghtCol2 - parts[1].length + 1).join(' ');

    lines[i] = parts[0] + filler1 + ' | ' + parts[1] + filler2 + ' | ' + parts[2];
  }

  return lines.join('\n');
};

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
