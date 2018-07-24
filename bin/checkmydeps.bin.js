#!/usr/bin/env node
'use strict';

const help = `
Usage: checkmydeps [options] [path]
    path  The path of the target node module to check. Uses current directory if
          no path is provided.

Options:
    --github-token         Defines the GitHub token to use to access private github
                           repositories. The token must have "repo" capability (check
                           your GitHub settings, section "Personal access tokens").
    -u, --hide-up-to-date  Prevents the display of up-to-date dependencies.
    -h, --help             Shows this description.
    -v, --version          Shows the current version of this tool.`;

// -----------------------------------------------------------------------------
// PROGRAM
// -----------------------------------------------------------------------------

const minimist = require('minimist');
const semver = require('semver');
const supportsColor = require('supports-color');
const checkalldeps = require('../lib/checkalldeps');
const { fetchLatestVersionFromGithubPackage } = require('../lib/fetcher');
const { generateFullReport } = require('../lib/reporter');
const { log, logError } = require('../lib/utils');
const currentVersion = require('../package.json').version;

const args = minimist(process.argv.slice(2));
const modulePath = args._[0] || '.';
const githubToken = args['github-token'] || process.env.GITHUB_TOKEN;
const hideUpToDate = args.u || args['hide-up-to-date'];
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
  let dependenciesByModule;

  try {
    dependenciesByModule = await checkalldeps(modulePath, { githubToken });
  } catch (err) {
    logError(err.message);
    return process.exit(1);
  }

  printReport(dependenciesByModule);

  if (shouldCheckForUpdate()) {
    await checkForUpdate();
  }
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function printReport(dependenciesByModule) {
  if (hideUpToDate) {
    for (const [name, deps] of Object.entries(dependenciesByModule)) {
      dependenciesByModule[name] = deps.filter(it => it.status !== 'ok');
    }
  }

  const report = generateFullReport(dependenciesByModule, { useColors });
  log(report);
}

function shouldCheckForUpdate() {
  return Math.random() > 0.66;
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
