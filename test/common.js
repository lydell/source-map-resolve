function u1(url) {
  return "code\n/*# sourceMappingURL=" + url + " */"
}

function u2(url) {
  return "code\n//# sourceMappingURL=" + url
}

function u3(url) {
  return "code\n/*\n# sourceMappingURL=" + url + "\n*/"
}

function u4(url) {
  return "code\n/*\n//# sourceMappingURL=" + url + "\n*/"
}

function read(x) {
  return function() {
    return x
  }
}

function Throws(x) {
  throw new Error(x)
}

function identity(x) {
  return x
}

function enqueue() {
  return new Promise(function (resolve) {
    setImmediate(function() { resolve() })
  })
}

function asyncifyPromise(asyncFn) {
  return async function(...args) {
    var callback = args.pop()
    await enqueue()
    try {
      let result = await asyncFn(...args)
      callback(null, result)
    } catch (error) {
      callback(error)
    }
  }
}

function makePromise(syncFn) {
  return async function(...args) {
    return await syncFn(...args)
  }
}

module.exports = {
  u1:       u1,
  u2:       u2,
  u3:       u3,
  u4:       u4,
  read:     read,
  Throws:   Throws,
  identity: identity,
  makePromise: makePromise,
  asyncifyPromise: asyncifyPromise
}
