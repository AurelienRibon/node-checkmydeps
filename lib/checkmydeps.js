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

    const packagePath = `${modulePath}/package.json`;

    if (!exists(packagePath)) {
      throw new Error(`Specified path has no package.json file`);
    }

    const pack = readJSON(packagePath);
    const deps = extractAllDeps(pack);
    const res  = { ok: [], nok: [] };
    if (!deps.length) { return res; }

    yield findRemoteVersions(deps, options, $$());

    for (const dep of deps) {
      const depInstalledVersion = getInstalledDepVersion(`${modulePath}/node_modules/${dep.name}/package.json`);
      const needsInstall = depInstalledVersion === 'none' || !semver.satisfies(depInstalledVersion, dep.versionToTestAgainst);
      const bucket       = needsInstall ? 'nok' : 'ok';

      res[bucket].push({
        name     : dep.name,
        found    : depInstalledVersion,
        needs    : dep.versionToTestAgainst,
        needsRaw : dep.version,
        type     : dep.type
      });
    }

    return res;

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

function extractAllDeps(pack) {
  const collection = Object.assign({}, pack.dependencies, pack.devDependencies, pack.optionalDependencies);
  const deps       = [];

  for (const name of Object.keys(collection)) {
    const version = collection[name].trim().replace(/^github:/, '');
    const type    = version.match(/^[\w\d-]+\//) ? 'github' : 'common';
    deps.push({ name, version, type });
  }

  return deps;
}

function findRemoteVersions(deps, options, done) {
  deps.forEach(dep => { dep.versionToTestAgainst = dep.version; });

  const githubDeps = deps.filter(it => it.type === 'github');
  if (!githubDeps.length) { return done(); }

  done = preventFunctionToBeCalledTwice(done);
  let completed = 0;

  for (const dep of githubDeps) {
    utils.downloadGithubPackage(dep.version, options.githubToken, (err, res) => {
      if (err) { return done(err); }

      dep.versionToTestAgainst = res.version;

      if (++completed === githubDeps.length) {
        return done();
      }
    });
  }
}

function getInstalledDepVersion(depPackagePath) {
  return exists(depPackagePath) ? readJSON(depPackagePath).version : 'none';
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

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
