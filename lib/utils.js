'use strict';

const fs = require('fs');
const { basename } = require('path');

exports.log = function(...args) {
  console.log(...args); // eslint-disable-line no-console
}

exports.logError = function(...args) {
  console.error(...args); // eslint-disable-line no-console
}

exports.hasPackageJson = function(path) {
  return fs.existsSync(`${path}/package.json`);
}

exports.listModules = function(path) {
  return fs.readdirSync(path).filter(it => exports.hasPackageJson(`${path}/${it}`));
}

exports.getModuleName = function(path) {
  return basename(path);
};

exports.readPackageJSON = function(path) {
  const file = `${path}/package.json`;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
};
