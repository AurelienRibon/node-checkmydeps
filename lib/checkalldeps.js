'use strict';

const checkmydeps = require('./checkmydeps');
const { hasPackageJson, listModules, getModuleName } = require('./utils');

module.exports = async function checkalldeps(path, options = {}) {
  const dependenciesByModule = {};
  let multiRepo = false;

  if (hasPackageJson(path)) {
    await registerSingleRepo(dependenciesByModule, path, options);
  } else {
    await registerMultiRepo(dependenciesByModule, path, options);
    multiRepo = true;
  }

  return { dependenciesByModule, multiRepo };
};

// -----------------------------------------------------------------------------
// DEPENDENCY REGISTRATION
// -----------------------------------------------------------------------------

async function registerSingleRepo(dependenciesByModule, path, options) {
  const moduleName = getModuleName(path);
  dependenciesByModule[moduleName] = await checkmydeps(path, options);
}

async function registerMultiRepo(dependenciesByModule, path, options) {
  const promises = [];

  for (const module of listModules(path)) {
    let promise = checkmydeps(`${path}/${module}`, options);
    promise.then(deps => (dependenciesByModule[module] = deps));
    promises.push(promise);
  }

  return Promise.all(promises);
}
