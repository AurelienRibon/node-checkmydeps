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

const minimist = require('minimist');
const semver = require('semver');
const supportsColor = require('supports-color');
const checkmydeps = require('../lib/checkmydeps');
const { fetchLatestVersionFromGithubPackage } = require('../lib/fetcher');
const { createReportTable } = require('../lib/reporter');
const currentVersion = require('../package.json').version;

const args = minimist(process.argv.slice(2));
const modulePath = args._[0] || '.';
const hideUpToDate = args['hide-up-to-date'];
const githubToken = args['github-token'] || process.env.GITHUB_TOKEN;
const showHelp = args.h || args.help;
const showVersion = args.v || args.version;

const useColors = supportsColor.stdout;

if (showVersion) {
  log(`checkmydeps v${currentVersion}`);
  return process.exit(0);
}

if (showHelp) {
  log(help.trim());
  return process.exit(0);
}

run();

async function run() {
  let dependencies;

  try {
    dependencies = await checkmydeps(modulePath, { githubToken });
  } catch (err) {
    logError(err.message);
    return process.exit(1);
  }

  printReport(dependencies);

  if (Math.random() > 0.66) {
    await checkForUpdate();
  }
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function printReport(dependencies) {
  if (hideUpToDate) {
    dependencies = dependencies.filter(dep => dep.status !== 'ok');
  }

  const report = createReportTable(dependencies, { useColors });
  log(report);
}

async function checkForUpdate() {
  try {
    const repository = 'aurelienribon/node-checkmydeps';
    const latestVersion = await fetchLatestVersionFromGithubPackage(repository);

    if (!semver.gt(latestVersion, currentVersion)) {
      return;
    }

    const startRed = useColors ? '\u001b[31;1m' : '';
    const endColor = useColors ? '\u001b[0m' : '';

    log(`\n${startRed}Version ${latestVersion} is available, current is ${currentVersion}, please update.${endColor}`);
  } catch (err) {
    log(`(unable to check for new version of the tool, are you offline?)`);
  }
}

function log(...args) {
  console.log(...args); // eslint-disable-line no-console
}

function logError(...args) {
  console.error(...args); // eslint-disable-line no-console
}
