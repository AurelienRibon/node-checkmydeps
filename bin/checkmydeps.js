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

const minimist    = require('minimist');
const semver      = require('semver');
const suspend     = require('suspend');
const checkmydeps = require('../lib/checkmydeps');
const utils       = require('../lib/utils');
const $$          = suspend.resume;

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

suspend.run(function* () {

  yield* checkForUpdate();

  const result = yield checkmydeps(modulePath, { githubToken }, $$());
  const report = createReport(result);
  console.log(report);

}, err => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
});


// -----------------------------------------------------------------------------
// REPORT CREATION
// -----------------------------------------------------------------------------

function createReport(result) {
  let report = '';

  if (result.ok.length && !hideUpToDate) {
    report += createTable(result.ok, 'UP-TO-DATE');
  }

  if (result.nok.length) {
    report += createTable(result.nok, 'OUTDATED');
  } else {
    report += '\nAll dependencies are up-to-date!';
  }

  return formatTable(report.trim());
}

function createTable(deps, title) {
  let table = `\n${title}\n--------------------------------------------------------------------------------\n`;

  for (const { name, found, needs, type } of deps) {
    let needs2 = needs;
    if (type === 'github') { needs2 += ' (on github)'; }

    table += `${name}|needs ${needs2}|found ${found}\n`;
  }

  return table;
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

// -----------------------------------------------------------------------------
// CHECK FOR UPDATE
// -----------------------------------------------------------------------------

function* checkForUpdate() {
  const content        = yield utils.downloadGithubPackage('AurelienRibon/node-checkmydeps', null, $$());
  const latestVersion  = content.version;
  const currentVersion = require('../package.json').version;

  if (semver.gt(latestVersion, currentVersion)) {
    const tty        = process.stdout.isTTY;
    const colorStart = tty ? '\u001b[31;1m' : '';
    const colorEnd   = tty ? '\u001b[0m' : '';

    const msg = `${colorStart}Version ${latestVersion} is available, current is ${currentVersion}, please update.${colorEnd}\n`;
    console.log(msg);
  }
}
