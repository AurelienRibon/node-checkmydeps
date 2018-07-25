'use strict';

const checkmydeps = require('./checkmydeps');
const { hasPackageJson, listModules, getModuleName } = require('./utils');

module.exports = async function checkalldeps(path, options = {}) {
  const dependenciesByModule = {};

  if (hasPackageJson(path)) {
    await registerSingleDeps(dependenciesByModule, path, options);
  } else {
    await registerMultiDeps(dependenciesByModule, path, options);
  }

  return dependenciesByModule;
};

// -----------------------------------------------------------------------------
// DEPENDENCY REGISTRATION
// -----------------------------------------------------------------------------

async function registerSingleDeps(dependenciesByModule, path, options) {
  const moduleName = getModuleName(path);
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
