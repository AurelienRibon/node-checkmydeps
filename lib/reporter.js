'use strict';

exports.generateFullReport = function(dependenciesByModule, options = {}) {
  let fullReport = '';

  for (const [moduleName, dependencies] of Object.entries(dependenciesByModule)) {
    if (dependencies.length > 0) {
      const report = generateReport(dependencies, options);
      fullReport += '\n\n> ' + moduleName + '\n' + '%' + '\n' + report;
    }
  }

  fullReport = formatReport(fullReport).trim();

  const maxLineLength = getMaxLineLength(fullReport);
  const separator = '-'.repeat(maxLineLength);
  fullReport = fullReport.replace(/^%$/gm, separator);

  return fullReport;
};

// -----------------------------------------------------------------------------
// FORMATTING HELPERS
// -----------------------------------------------------------------------------

const BEGIN_NOK = '\u001b[31;1m';
const BEGIN_OK = '\u001b[32;1m';
const END = '\u001b[0m';

function generateReport(deps, useColors = true) {
  let table = '';

  for (const { name, found, needs, type, status } of deps) {
    const needsStr = type === 'github' ? `${needs} (on github)` : needs;

    if (useColors && status === 'outdated') {
      table += `${BEGIN_NOK}${name}${END} | need ${needsStr} | found ${BEGIN_NOK}${found}${END}\n`;
      continue;
    }

    if (useColors && status === 'ok') {
      table += `${BEGIN_OK}${name}${END} | need ${needsStr} | found ${BEGIN_OK}${found}${END}\n`;
      continue;
    }

    table += `${name} | need ${needsStr} | found ${found}\n`;
  }

  return formatReport(table.trim());
}

function formatReport(text) {
  const items = text.split('\n').map(line => ({ line, formattedLine: line, columns: null, rawColumns: null }));

  for (const item of items) {
    const columns = item.line.split('|').map(it => it.trim());
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
}

// -----------------------------------------------------------------------------
// MISC HELPERS
// -----------------------------------------------------------------------------

function getMaxLineLength(txt) {
  const lengths = txt.split('\n').map(it => trimColors(it).length);
  return Math.max(...lengths);
}

function trimColors(str) {
  return str.replace(/\u001b\[.+?m/g, ''); // eslint-disable-line no-control-regex
}
