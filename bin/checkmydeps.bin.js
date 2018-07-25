#!/usr/bin/env node
'use strict';

const help = `
USAGE: checkmydeps [options] [path]

    path      The optiontal path of the target node module to check. Default to
              current directory.
    options   See below

OPTIONS:
    -t, --token      Define the token to access private Github repositories.
    -n, --none       Prevent the display of up-to-date dependencies.
    -h, --help       Show this description.
    -v, --version    Show the current version of this tool.`;

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
const argToken = args.t || args.token || process.env.GITHUB_TOKEN;
const argNone = args.n || args.none;
const argAll = args.a || args.all;
const argHelp = args.h || args.help;
const argVersion = args.v || args.version;

const useColors = supportsColor.stdout;

if (argVersion) {
  log(`checkmydeps v${currentVersion}`);
  return process.exit(0);
}

if (argHelp) {
  log(help.trim());
  return process.exit(0);
}

run();

async function run() {
  let dependenciesByModule;

  try {
    dependenciesByModule = await checkalldeps(modulePath, { githubToken: argToken });
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
  if (argNone) {
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
