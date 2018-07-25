#!/usr/bin/env node
'use strict';

const help = `
USAGE: checkmydeps [options] [path]

    path      The optional path of the target node module to check. Default to
              current directory.
    options   See below

NOTE:
    You may get some "404" errors if some dependencies use private Github
    repositories. If you can access those repositories, then just provide an
    access token to this tool, using either argument --token, or by setting
    an environment variable GITHUB_TOKEN.
    To create a token, just go to your account settings on Github, in section
    "Personal access tokens". Create a new token with the "repo" capability
    (it only needs to be able to read from a repository).

OPTIONS:
    -t, --token      Define the token to access private Github repositories.
    -m, --minimal    Prevent the display of up-to-date dependencies.
    -a, --all        Force the display of up-to-date dependencies.
    -h, --help       Show this description.
    -v, --version    Show the current version of this tool.`;

// -----------------------------------------------------------------------------
// PROGRAM
// -----------------------------------------------------------------------------

const minimist = require('minimist');
const semver = require('semver');
const supportsColor = require('supports-color');
const checkmydeps = require('../lib/checkmydeps');
const checkalldeps = require('../lib/checkalldeps');
const { fetchLatestVersionFromGithubPackage } = require('../lib/fetcher');
const { generateSingleRepoReport, generateMultiRepoReport } = require('../lib/reporter');
const { log, logError, hasPackageJson} = require('../lib/utils');
const { version: currentVersion } = require('../package.json');

const args = minimist(process.argv.slice(2));
const path = args._[0] || '.';
const argToken = args.t || args.token || process.env.GITHUB_TOKEN;
const argMinimal = args.m || args.minimal;
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
  if (hasPackageJson(path)) {
    await runForSingleRepo(path, argToken);
  } else {
    await runForMultiRepo(path, argToken);
  }

  if (shouldCheckForUpdate()) {
    await checkForUpdate();
  }
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

async function runForSingleRepo(path, githubToken) {
  let dependencies;

  try {
    dependencies = await checkmydeps(path, { githubToken });
  } catch (err) {
    logError(err.message);
    return process.exit(1);
  }

  if (argMinimal) {
    dependencies = dependencies.filter(it => it.isOutdated());
  }

  const report = generateSingleRepoReport(dependencies, { useColors });
  logReport(report);
}

async function runForMultiRepo(path, githubToken) {
  let dependenciesByModule;

  try {
    dependenciesByModule = await checkalldeps(path, { githubToken });
  } catch (err) {
    logError(err.message);
    return process.exit(1);
  }

  if (!argAll) {
    for (const [name, deps] of Object.entries(dependenciesByModule)) {
      dependenciesByModule[name] = deps.filter(it => it.isOutdated());
    }
  }

  const report = generateMultiRepoReport(dependenciesByModule, { useColors });
  logReport(report);
}

function logReport(report) {
  if (report.length > 0) {
    log(report);
  }
}

// -----------------------------------------------------------------------------
// UPDATE CHECK
// -----------------------------------------------------------------------------

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
