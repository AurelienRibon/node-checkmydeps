'use strict';

const fs      = require('fs');
const https   = require('https');
const semver  = require('semver');
const suspend = require('suspend');
const $$      = suspend.resume;

/**
 * A function that retrieves all dependencies listed in package.json of the
 * specified module, and check them against installed modules. For github
 * urls, the current version of the remote repository is checked (at branch/tag
 * specified in the url, if any), and compared against the installed version.
 */
module.exports = function(modulePath, options, done) {
  if (!done) {
    done = (err, res) => console.log(err || res);
  }

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

function getInstalledDepVersion(depPackagePath) {
  return exists(depPackagePath) ? readJSON(depPackagePath).version : 'none';
}

// -----------------------------------------------------------------------------
// HELPERS
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
    getGithubPackage(dep.version, options, (err, res) => {
      if (err) { return done(err); }

      dep.versionToTestAgainst = res.version;

      if (++completed === githubDeps.length) {
        return done();
      }
    });
  }
}

function getGithubPackage(repo, options, done) {
  const token = options.githubToken;
  const parts = repo.split(/[\/#]/);

  if (parts.length < 2) {
    return done(new Error(`Invalid github repository: "${repo}"`));
  }

  if (parts.length === 2) {
    parts.push('master');
  }

  const path    = parts.join('/');
  const request = {
    hostname : 'raw.githubusercontent.com',
    path     : `/${path}/package.json`,
    headers  : {}
  };

  if (token) {
    request.headers.Authorization = `token ${token}`;
  }

  https.get(request, res => {
    if (res.statusCode !== 200) {
      return done(new Error(`Github returned status ${res.statusCode} for repo "${repo}"`));
    }

    let content = '';

    res.on('data', chunk => {
      content += chunk.toString();
    });

    res.on('end', () => {
      let json;
      try {
        json = JSON.parse(content);
      } catch (err) {
        return done(err);
      }
      return done(null, json);
    });

  }).on('error', done);
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
