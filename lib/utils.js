'use strict';

exports.log = function(...args) {
  console.log(...args); // eslint-disable-line no-console
}

exports.logError = function(...args) {
  console.error(...args); // eslint-disable-line no-console
}
