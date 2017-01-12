'use strict';

const fs      = require('fs');
const semver  = require('semver');
const suspend = require('suspend');
const utils   = require('./utils');
const $$      = suspend.resume;

/**
 * A function that retrieves all dependencies listed in package.json of the
 * specified module, and check them against installed modules. For github
 * urls, the current version of the remote repository is checked (at branch/tag
 * specified in the url, if any), and compared against the installed version.
 */
module.exports = function checkMyDeps(modulePath, options, done) {
  suspend.run(function* () {

    const { githubToken } = options || {};
    const packagePath = `${modulePath}/package.json`;

    if (!exists(packagePath)) {
      throw new Error(`Specified path has no package.json file`);
    }

    const packageContent = readJSON(packagePath);
    const dependencies = []
      .concat(extractDependencies(packageContent.dependencies, 'normal'))
      .concat(extractDependencies(packageContent.devDependencies, 'dev'))
      .concat(extractDependencies(packageContent.optionalDependencies, 'optional'))
      .sort((a, b) => a.name.localeCompare(b.name));

    yield fetchRemoteVersions(dependencies, githubToken, $$());

    for (const dep of dependencies) {
      const depInstalledVersion = getInstalledDepVersion(`${modulePath}/node_modules/${dep.name}/package.json`);
      const outdated = depInstalledVersion === 'none' || !semver.satisfies(depInstalledVersion, dep.needs);

      dep.found  = depInstalledVersion;
      dep.status = outdated ? 'outdated' : 'ok';
    }

    return dependencies;

  }, done);
};

/**
 * Convenience function to convert the result of function "checkMyDeps" into a
 * human readable text, like the one produced by the command-line tool.
 */
module.exports.createReportTable = utils.createReportTable;

/**
 * Convenience function to (re)format a text report produced by "createReportTable".
 * Usually needed to align several reports joined into a single text.
 */
module.exports.formatReportTable = utils.formatReportTable;

// -----------------------------------------------------------------------------
// DEPENDENCY MANAGEMENT
// -----------------------------------------------------------------------------

function extractDependencies(rawDependencies, kind) {
  if (!rawDependencies) { return []; }

  const dependencies = Object.keys(rawDependencies).map(name => {
    const needs = rawDependencies[name];
    return new Dependency(name, kind, needs);
  });

  return dependencies;
}

function fetchRemoteVersions(deps, githubToken, done) {
  const githubDeps    = deps.filter(it => it.type === 'github');
  const requestsCount = githubDeps.length;

  if (requestsCount === 0) { return done(); }

  let requestsCompleted = 0;
  done = preventFunctionToBeCalledTwice(done);

  for (const dep of githubDeps) {
    utils.fetchLatestVersionFromGithubPackage(dep.needsRaw, githubToken, (err, version) => {
      if (err) { return done(err); }
      dep.needs = version;
      onRequestDone();
    });
  }

  function onRequestDone() {
    if (++requestsCompleted === requestsCount) {
      return done();
    }
  }
}

function getInstalledDepVersion(depPackagePath) {
  return exists(depPackagePath) ? readJSON(depPackagePath).version : 'none';
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

class Dependency {
  constructor(name, kind, needs) {
    needs = needs.trim().replace(/^github:/, '');

    this.name     = name;
    this.kind     = kind;
    this.needs    = needs;
    this.needsRaw = needs;
    this.found    = null;
    this.status   = 'unknown';
    this.type     = needs.match(/^[\w\d-]+\//) ? 'github' : 'npm';

    Object.preventExtensions(this);
  }
}

function preventFunctionToBeCalledTwice(fn) {
  const newFn = (...args) => {
    if (!newFn.called) {
      newFn.called = true;
      return fn(...args);
    }
  };

  return newFn;
}

function exists(file) {
  return fs.existsSync(file);
}

function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
