'use strict';

const https = require('https');

exports.createReportTable = function(deps, options) {
  const useColors = options && options.useColors;

  let table = '';

  const startRed   = '\u001b[31;1m';
  const startGreen = '\u001b[32;1m';
  const endColor   = '\u001b[0m';

  for (const { name, found, needs, type, status } of deps) {
    let needs2 = needs;
    if (type === 'github') { needs2 += ' (on github)'; }

    if (useColors && status === 'outdated') {
      table += `${startRed}${name}${endColor} | needs ${needs2} | found ${startRed}${found}${endColor}\n`;
      continue;
    }

    if (useColors && status === 'ok') {
      table += `${startGreen}${name}${endColor} | needs ${needs2} | found ${startGreen}${found}${endColor}\n`;
      continue;
    }

    table += `${name} | needs ${needs2} | found ${found}\n`;
  }

  return exports.formatReportTable(table.trim());
};

exports.formatReportTable = function(text) {
  const items = text.split('\n').map(line => ({ line, formattedLine: line, columns: null, rawColumns: null }));

  for (const item of items) {
    const columns = item.line.split('|').map(trim);
    if (columns.length !== 3) { continue; }

    item.columns    = columns;
    item.rawColumns = columns.map(trimColors);
  }

  const itemsToFormat = items.filter(it => it.columns);
  const lengthsCol1   = itemsToFormat.map(it => it.rawColumns[0].length);
  const lengthsCol2   = itemsToFormat.map(it => it.rawColumns[1].length);
  const maxLenghtCol1 = Math.max(...lengthsCol1);
  const maxLenghtCol2 = Math.max(...lengthsCol2);

  for (const item of itemsToFormat) {
    const filler1 = new Array(maxLenghtCol1 - item.rawColumns[0].length + 1).join(' ');
    const filler2 = new Array(maxLenghtCol2 - item.rawColumns[1].length + 1).join(' ');

    item.formattedLine = item.columns[0] + filler1 + ' | ' + item.columns[1] + filler2 + ' | ' + item.columns[2];
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

function trimColors(str) {
  return str.replace(/\u001b\[.+?m/g, '');
}
