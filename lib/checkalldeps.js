'use strict';

const checkmydeps = require('./checkmydeps');
const { listModules } = require('./utils');

module.exports = async function checkalldeps(path, options = {}) {
  const dependenciesByModule = {};
  await registerMultiRepo(dependenciesByModule, path, options);
  return dependenciesByModule;
};

// -----------------------------------------------------------------------------
// DEPENDENCY REGISTRATION
// -----------------------------------------------------------------------------

async function registerMultiRepo(dependenciesByModule, path, options) {
  const promises = [];

  for (const module of listModules(path)) {
    let promise = checkmydeps(`${path}/${module}`, options);
    promise.then(deps => (dependenciesByModule[module] = deps));
    promises.push(promise);
  }

  return Promise.all(promises);
}
