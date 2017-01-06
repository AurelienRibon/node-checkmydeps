'use strict';

const https = require('https');

exports.createReportTable = function(deps) {
  let table = '';

  for (const { name, found, needs, type } of deps) {
    let needs2 = needs;
    if (type === 'github') { needs2 += ' (on github)'; }

    table += `${name} | needs ${needs2} | found ${found}\n`;
  }

  return exports.formatReportTable(table.trim());
};

exports.formatReportTable = function(text) {
  const items = text.split('\n').map(line => ({ line, formattedLine: line, columns: null }));

  for (const item of items) {
    const columns = item.line.split('|').map(trim);
    if (columns.length === 3) { item.columns = columns; }
  }

  const itemsToFormat = items.filter(it => it.columns);
  const column1       = itemsToFormat.map(it => it.columns[0].length);
  const column2       = itemsToFormat.map(it => it.columns[1].length);
  const maxLenghtCol1 = Math.max(...column1);
  const maxLenghtCol2 = Math.max(...column2);

  for (const item of itemsToFormat) {
    const columns = item.columns;
    const filler1 = new Array(maxLenghtCol1 - columns[0].length + 1).join(' ');
    const filler2 = new Array(maxLenghtCol2 - columns[1].length + 1).join(' ');

    item.formattedLine = columns[0] + filler1 + ' | ' + columns[1] + filler2 + ' | ' + columns[2];
  }

  return items.map(it => it.formattedLine).join('\n');
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
  const date    = new Date().getTime();
  const request = {
    hostname : 'raw.githubusercontent.com',
    path     : `/${path}/package.json?nocache=${date}`,
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

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function trim(str) {
  return str.trim();
}
