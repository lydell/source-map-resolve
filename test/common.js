function u1 (url) {
  return `code\n/*# sourceMappingURL=${url} */`
}

function u2 (url) {
  return `code\n//# sourceMappingURL=${url}`
}

function u3 (url) {
  return `code\n/*\n# sourceMappingURL=${url}\n*/`
}

function u4 (url) {
  return `code\n/*\n//# sourceMappingURL=${url}\n*/`
}

function read (x) {
  return () => {
    return x
  }
}

function Throws (x) {
  throw new Error(x)
}

function identity (x) {
  return x
}

function asyncify (syncFn) {
  return function () {
    const args = Array.prototype.slice.call(arguments)
    const callback = args.pop()
    let result
    setImmediate(function () {
      try {
        result = syncFn.apply(this, args)
      } catch (error) {
        return callback(error)
      }
      callback(null, result)
    })
  }
}

export default {
  u1,
  u2,
  u3,
  u4,
  read,
  Throws,
  identity,
  asyncify
}
