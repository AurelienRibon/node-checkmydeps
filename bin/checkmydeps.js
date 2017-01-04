#!/usr/bin/env node
'use strict';

const help = `
Usage: checkmydeps [options] [path]
    path  The path of the target node module to check. Uses current directory if
          no path is provided.

Options:
    --hide-up-to-date  Prevents the display of up-to-date dependencies.
    --github-token     Defines the GitHub token to use to access private github
                       repositories. The token must have "repo" capability (check
                       your GitHub settings, section "Personal access tokens").
    -h, --help         Shows this description.`;

// -----------------------------------------------------------------------------
// PROGRAM
// -----------------------------------------------------------------------------

const checkmydeps  = require('./lib/checkmydeps');
const minimist     = require('minimist');

const args         = minimist(process.argv.slice(2));
const modulePath   = args._[0] || '.';
const hideUpToDate = args['hide-up-to-date'];
const githubToken  = args['github-token'] || process.env.GITHUB_TOKEN;
const showHelp     = args.h || args.help;

if (showHelp) {
  console.log(help.trim());
  process.exit(0);
  return;
}

checkmydeps(modulePath, { githubToken }, (err, res) => {
  if (err) { return console.log(err.message); }

  const report = createReport(res);
  console.log(report);
});

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function createReport(deps) {
  let report = '';

  if (deps.ok.length && !hideUpToDate) {
    report += '\nUP-TO-DATE\n';
    report += '--------------------------------------------------------------------------------\n';

    for (const { name, found, needs, type } of deps.ok) {
      let needs2 = needs;
      if (type === 'github') { needs2 += ' (on github)'; }

      report += `${name}|needs ${needs2}|found ${found}\n`;
    }
  }

  if (deps.nok.length) {
    report += '\nOUTDATED\n';
    report += '--------------------------------------------------------------------------------\n';

    for (const { name, found, needs, type } of deps.nok) {
      let needs2 = needs;
      if (type === 'github') { needs2 += ' (on github)'; }

      report += `${name}|needs ${needs2}|found ${found}\n`;
    }
  } else {
    report += '\nAll dependencies are up-to-date!';
  }

  return formatTable(report.trim());
}

function formatTable(text) {
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
}
