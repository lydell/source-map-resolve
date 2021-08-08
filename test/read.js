import test from 'tape'
import common from './common.js'
import sourceMapResolve from '../index.js'

const u1 = common.u1
const asyncify = common.asyncify

const mapUrl = 'operators%20map.json'
const codeUrl = './built files/operators:+-<>%25.js'
const sourceUrl = '../source files/operators:+-<>%25.coffee'

function readTest (t, files) {
  return (file, callback) => {
    const fileData = files[file]
    t.ok(fileData, 'decoded file name')
    if (callback) {
      callback(null, fileData)
    } else {
      return fileData
    }
  }
}

function testResolveSourceMap (method, sync) {
  return t => {
    t.plan(2)

    if (sync) {
      method = asyncify(method)
    }

    const read = readTest(t, {
      'built files/operators map.json': '{}'
    })

    method(u1(mapUrl), codeUrl, read, error => {
      t.error(error)
    })
  }
}

test('.resolveSourceMap', testResolveSourceMap(sourceMapResolve.resolveSourceMap, false))

test('.resolveSourceMapSync', testResolveSourceMap(sourceMapResolve.resolveSourceMapSync, true))

function testResolveSources (method, sync) {
  return t => {
    t.plan(2)

    if (sync) {
      method = asyncify(method)
    }

    const map = {
      sources: [sourceUrl]
    }
    const read = readTest(t, {
      '../source files/operators:+-<>%.coffee': 'source code'
    })

    method(map, mapUrl, read, error => {
      t.error(error)
    })
  }
}

test('.resolveSources', testResolveSources(sourceMapResolve.resolveSources, false))

test('.resolveSourcesSync', testResolveSources(sourceMapResolve.resolveSourcesSync, true))

function testResolve (method, sync) {
  return t => {
    t.plan(3)

    if (sync) {
      method = asyncify(method)
    }

    const map = {
      sources: [sourceUrl]
    }
    const read = readTest(t, {
      'built files/operators map.json': JSON.stringify(map),
      'source files/operators:+-<>%.coffee': 'source code'
    })

    method(u1(mapUrl), codeUrl, read, error => {
      t.error(error)
    })
  }
}

test('.resolve', testResolve(sourceMapResolve.resolve, false))

test('.resolveSync', testResolve(sourceMapResolve.resolveSync, true))
