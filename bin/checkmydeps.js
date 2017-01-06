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
    -h, --help         Shows this description.
    -v, --version      Shows the current version of this tool.`;

// -----------------------------------------------------------------------------
// PROGRAM
// -----------------------------------------------------------------------------

const minimist       = require('minimist');
const semver         = require('semver');
const suspend        = require('suspend');
const useColors      = require('supports-color');
const checkmydeps    = require('../lib/checkmydeps');
const utils          = require('../lib/utils');
const currentVersion = require('../package.json').version;
const $$             = suspend.resume;

const args         = minimist(process.argv.slice(2));
const modulePath   = args._[0] || '.';
const hideUpToDate = args['hide-up-to-date'];
const githubToken  = args['github-token'] || process.env.GITHUB_TOKEN;
const showHelp     = args.h || args.help;
const showVersion  = args.v || args.version;

if (showVersion) {
  console.log(`checkmydeps v${currentVersion}`);
  return process.exit(0);
}

if (showHelp) {
  console.log(help.trim());
  return process.exit(0);
}

suspend.run(function* () {

  const deps   = yield checkmydeps(modulePath, { githubToken }, $$());
  const report = createReport(deps);
  console.log(report);

  yield* checkForUpdate();

}, err => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
});

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function createReport(deps) {
  if (hideUpToDate) {
    deps = deps.filter(dep => dep.status !== 'ok');
  }

  return utils.createReportTable(deps, { useColors });
}

function* checkForUpdate() {
  const content       = yield utils.downloadGithubPackage('AurelienRibon/node-checkmydeps', null, $$());
  const latestVersion = content.version;

  if (semver.gt(latestVersion, currentVersion)) {
    const startRed = useColors ? '\u001b[31;1m' : '';
    const endColor = useColors ? '\u001b[0m'    : '';

    console.log(`\n${startRed}Version ${latestVersion} is available, current is ${currentVersion}, please update.${endColor}`);
  }
}
