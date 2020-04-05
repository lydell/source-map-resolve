"use strict";

function u1(url) {
  return `code\n/*# sourceMappingURL=${url} */`;
}

function u2(url) {
  return `code\n//# sourceMappingURL=${url}`;
}

function u3(url) {
  return `code\n/*\n# sourceMappingURL=${url}\n*/`;
}

function u4(url) {
  return `code\n/*\n//# sourceMappingURL=${url}\n*/`;
}

function Throws(x) {
  throw new Error(x);
}

function identity(x) {
  return x;
}

module.exports = {
  u1,
  u2,
  u3,
  u4,
  Throws,
  identity,
};
