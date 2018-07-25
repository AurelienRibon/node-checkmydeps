'use strict';

const semver = require('semver');
const { fetchLatestVersionFromGithubPackage } = require('./fetcher');
const { log, hasPackageJson, readPackageJSON, getModuleName } = require('./utils');

module.exports = async function checkmydeps(modulePath, options = {}) {
  const { githubToken } = options;

  if (!hasPackageJson(modulePath)) {
    throw new Error(`Specified path has no package.json file`);
  }

  const packageContent = readPackageJSON(modulePath);
  const dependencies = []
    .concat(extractDependencies(packageContent.dependencies, 'normal'))
    .concat(extractDependencies(packageContent.devDependencies, 'dev'))
    .concat(extractDependencies(packageContent.optionalDependencies, 'optional'))
    .sort((a, b) => a.name.localeCompare(b.name));

  const moduleName = getModuleName(modulePath);
  await fetchRemoteVersions(dependencies, githubToken, moduleName);

  for (const dep of dependencies) {
    const depInstalledVersion = getInstalledDepVersion(`${modulePath}/node_modules/${dep.name}`);
    const outdated = depInstalledVersion === 'none' || !semver.satisfies(depInstalledVersion, dep.needs);

    dep.found = depInstalledVersion;
    dep.status = outdated ? 'outdated' : 'ok';
  }

  return dependencies;
};

// -----------------------------------------------------------------------------
// DEPENDENCY MANAGEMENT
// -----------------------------------------------------------------------------

function extractDependencies(rawDependencies, kind) {
  if (!rawDependencies) {
    return [];
  }

  const dependencies = Object.keys(rawDependencies).map(name => {
    const needs = rawDependencies[name];
    return new Dependency(name, kind, needs);
  });

  return dependencies;
}

async function fetchRemoteVersions(deps, githubToken, moduleName) {
  const githubDeps = deps.filter(it => it.type === 'github');
  const requestsCount = githubDeps.length;

  if (requestsCount === 0) {
    return;
  }

  const promises = [];

  for (const dep of githubDeps) {
    let promise = fetchLatestVersionFromGithubPackage(dep.needsRaw, githubToken);
    promise = promise
      .then(version => (dep.needs = version))
      .catch(err => log(`While analyzing module "${moduleName}", ${err.message}`));
    promises.push(promise);
  }

  await Promise.all(promises);
}

function getInstalledDepVersion(depPath) {
  return hasPackageJson(depPath) ? readPackageJSON(depPath).version : 'none';
}

// -----------------------------------------------------------------------------
// DEPENDENCY CLASS
// -----------------------------------------------------------------------------

class Dependency {
  constructor(name, kind, needs) {
    needs = needs.trim().replace(/^github:/, '');

    this.name = name;
    this.kind = kind;
    this.needs = needs;
    this.needsRaw = needs;
    this.found = null;
    this.status = 'unknown';
    this.type = needs.match(/^[\w\d-]+\//) ? 'github' : 'npm';

    Object.preventExtensions(this);
  }

  isOutdated() {
    return this.status !== 'ok';
  }
}
