'use strict';

const https = require('https');

const BEGIN_NOK = '\u001b[31;1m';
const BEGIN_OK = '\u001b[32;1m';
const END = '\u001b[0m';

exports.createReportTable = function(deps, options = {}) {
  const useColors = options.useColors;

  let table = '';

  for (const { name, found, needs, type, status } of deps) {
    const needsStr = type === 'github' ? `${needs} (on github)` : needs;

    if (useColors && status === 'outdated') {
      table += `${BEGIN_NOK}${name}${END} | needs ${needsStr} | found ${BEGIN_NOK}${found}${END}\n`;
      continue;
    }

    if (useColors && status === 'ok') {
      table += `${BEGIN_OK}${name}${END} | needs ${needsStr} | found ${BEGIN_OK}${found}${END}\n`;
      continue;
    }

    table += `${name} | needs ${needsStr} | found ${found}\n`;
  }

  return exports.formatReportTable(table.trim());
};

exports.formatReportTable = function(text) {
  const items = text.split('\n').map(line => ({ line, formattedLine: line, columns: null, rawColumns: null }));

  for (const item of items) {
    const columns = item.line.split('|').map(trim);
    if (columns.length !== 3) {
      continue;
    }

    item.columns = columns;
    item.rawColumns = columns.map(trimColors);
  }

  const itemsToFormat = items.filter(it => it.columns);
  const lengthsCol1 = itemsToFormat.map(it => it.rawColumns[0].length);
  const lengthsCol2 = itemsToFormat.map(it => it.rawColumns[1].length);
  const maxLenghtCol1 = Math.max(...lengthsCol1);
  const maxLenghtCol2 = Math.max(...lengthsCol2);

  for (const item of itemsToFormat) {
    const filler1 = new Array(maxLenghtCol1 - item.rawColumns[0].length + 1).join(' ');
    const filler2 = new Array(maxLenghtCol2 - item.rawColumns[1].length + 1).join(' ');
    item.formattedLine = item.columns[0] + filler1 + ' | ' + item.columns[1] + filler2 + ' | ' + item.columns[2];
  }

  return items.map(it => it.formattedLine).join('\n');
};

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
        return reject(new Error(`Github returned status ${res.statusCode} for repo "${repo}"`));
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

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function trim(str) {
  return str.trim();
}

function trimColors(str) {
  return str.replace(/\u001b\[.+?m/g, ''); // eslint-disable-line no-control-regex
}
