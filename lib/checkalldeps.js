'use strict';

const fs = require('fs');
const { basename } = require('path');
const checkmydeps = require('./checkmydeps');

module.exports = async function checkalldeps(path, options = {}) {
  const dependenciesByModule = {};

  if (hasPackageJson(path)) {
    await registerSingleDeps(dependenciesByModule, path, options);
  } else {
    await registerMultiDeps(dependenciesByModule, path, options);
  }

  return dependenciesByModule;
};

async function registerSingleDeps(dependenciesByModule, path, options) {
  const moduleName = basename(path);
  dependenciesByModule[moduleName] = await checkmydeps(path, options);
}

async function registerMultiDeps(dependenciesByModule, path, options) {
  const promises = [];

  for (const module of listModules(path)) {
    let promise = checkmydeps(`${path}/${module}`, options);
    promise.then(deps => (dependenciesByModule[module] = deps));
    promises.push(promise);
  }

  return Promise.all(promises);
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function hasPackageJson(path) {
  return fs.existsSync(`${path}/package.json`);
}

function listModules(path) {
  return fs.readdirSync(path).filter(it => hasPackageJson(`${path}/${it}`));
}
