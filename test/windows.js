import path from 'node:path'
import test from 'tape'
import common from './common.js'
import sourceMapResolve from '../index.js'

const u1 = common.u1
const u2 = common.u2
const u3 = common.u3
const read = common.read
const identity = common.identity
const asyncify = common.asyncify

path.sep = '\\'

function testResolveSourceMap (method, sync) {
  return t => {
    const wrap = (sync ? identity : asyncify)

    const codeUrl = 'c:\\a\\b\\c\\foo.js'

    t.plan(3 * 2)

    if (sync) {
      method = asyncify(method)
    }

    const map = {}
    const readMap = wrap(read(JSON.stringify(map)))

    method(u1('foo.js.map'), codeUrl, readMap, (error, result) => {
      t.error(error)
      t.deepEqual(result, {
        sourceMappingURL: 'foo.js.map',
        url: '/a/b/c/foo.js.map',
        sourcesRelativeTo: '/a/b/c/foo.js.map',
        map
      })
    })

    method(u2('/foo.js.map'), codeUrl, readMap, (error, result) => {
      t.error(error)
      t.deepEqual(result, {
        sourceMappingURL: '/foo.js.map',
        url: '/foo.js.map',
        sourcesRelativeTo: '/foo.js.map',
        map
      })
    })

    method(u3('../foo.js.map'), codeUrl, readMap, (error, result) => {
      t.error(error)
      t.deepEqual(result, {
        sourceMappingURL: '../foo.js.map',
        url: '/a/b/foo.js.map',
        sourcesRelativeTo: '/a/b/foo.js.map',
        map
      })
    })
  }
}

test('.resolveSourceMap', testResolveSourceMap(sourceMapResolve.resolveSourceMap, false))

test('.resolveSourceMapSync', testResolveSourceMap(sourceMapResolve.resolveSourceMapSync, true))

function testResolveSources (method, sync) {
  return t => {
    const wrap = (sync ? identity : asyncify)

    const mapUrl = 'c:\\a\\b\\c\\foo.js.map'

    t.plan(1 * 3)

    if (sync) {
      method = asyncify(method)
    }

    const map = {
      sources: ['foo.js', '/foo.js', '../foo.js']
    }

    method(map, mapUrl, wrap(identity), (error, result) => {
      t.error(error)
      t.deepEqual(result.sourcesResolved, ['/a/b/c/foo.js', '/foo.js', '/a/b/foo.js'])
      t.deepEqual(result.sourcesContent, ['/a/b/c/foo.js', '/foo.js', '/a/b/foo.js'])
    })
  }
}

test('.resolveSources', testResolveSources(sourceMapResolve.resolveSources, false))

test('.resolveSourcesSync', testResolveSources(sourceMapResolve.resolveSourcesSync, true))

function testResolve (method, sync) {
  return t => {
    const wrap = (sync ? identity : asyncify)
    const wrapMap = (mapFn, fn) => {
      return wrap(url => {
        if (/\.map$/.test(url)) {
          return mapFn(url)
        }
        return fn(url)
      })
    }

    const codeUrl = 'c:\\a\\b\\c\\foo.js'

    t.plan(3 * 2)

    if (sync) {
      method = asyncify(method)
    }

    const map = {
      sources: ['foo.js', '/foo.js', '../foo.js']
    }
    const readMap = wrapMap(read(JSON.stringify(map)), identity)

    method(u1('foo.js.map'), codeUrl, readMap, (error, result) => {
      t.error(error)
      t.deepEqual(result, {
        sourceMappingURL: 'foo.js.map',
        url: '/a/b/c/foo.js.map',
        sourcesRelativeTo: '/a/b/c/foo.js.map',
        map,
        sourcesResolved: ['/a/b/c/foo.js', '/foo.js', '/a/b/foo.js'],
        sourcesContent: ['/a/b/c/foo.js', '/foo.js', '/a/b/foo.js']
      })
    })

    method(u2('/foo.js.map'), codeUrl, readMap, (error, result) => {
      t.error(error)
      t.deepEqual(result, {
        sourceMappingURL: '/foo.js.map',
        url: '/foo.js.map',
        sourcesRelativeTo: '/foo.js.map',
        map,
        sourcesResolved: ['/foo.js', '/foo.js', '/foo.js'],
        sourcesContent: ['/foo.js', '/foo.js', '/foo.js']
      })
    })

    method(u3('../foo.js.map'), codeUrl, readMap, (error, result) => {
      t.error(error)
      t.deepEqual(result, {
        sourceMappingURL: '../foo.js.map',
        url: '/a/b/foo.js.map',
        sourcesRelativeTo: '/a/b/foo.js.map',
        map,
        sourcesResolved: ['/a/b/foo.js', '/foo.js', '/a/foo.js'],
        sourcesContent: ['/a/b/foo.js', '/foo.js', '/a/foo.js']
      })
    })
  }
}

test('.resolve', testResolve(sourceMapResolve.resolve, false))

test('.resolveSync', testResolve(sourceMapResolve.resolveSync, true))
