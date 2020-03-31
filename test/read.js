var test         = require("tape")
var common       = require("./common")
var u1           = common.u1
var asyncify     = common.asyncify
var identity     = common.identity
var makePromise  = common.makePromise
var asyncifyPromise = common.asyncifyPromise

var sourceMapResolve = require("../")

var mapUrl = "operators%20map.json"
var codeUrl = "./built files/operators:+-<>%25.js"
var sourceUrl = "../source files/operators:+-<>%25.coffee"

function readTest(t, files) {
  return function(file) {
    var fileData = files[file]
    t.ok(fileData, "decoded file name")
    return fileData
  }
}



function testResolveSourceMap(method, sync) {
  return function(t) {
    var wrap = (sync ? identity : makePromise)
    t.plan(2)

    if (sync) {
      method = asyncify(method)
    } else {
      method = asyncifyPromise(method)
    }

    var read = readTest(t, {
      "built files/operators map.json": "{}"
    })

    method(u1(mapUrl), codeUrl, wrap(read), function(error) {
      t.error(error)
    })

  }
}

test(".resolveSourceMap",     testResolveSourceMap(sourceMapResolve.resolveSourceMap,    false))

test(".resolveSourceMapSync", testResolveSourceMap(sourceMapResolve.resolveSourceMapSync, true))


function testResolveSources(method, sync) {
  return function(t) {
    var wrap = (sync ? identity : makePromise)
    t.plan(2)

    if (sync) {
      method = asyncify(method)
    } else {
      method = asyncifyPromise(method)
    }

    var map = {
      sources: [sourceUrl]
    }
    var read = readTest(t, {
      "../source files/operators:+-<>%.coffee": "source code"
    })

    method(map, mapUrl, wrap(read), function(error) {
      t.error(error)
    })

  }
}

test(".resolveSources",     testResolveSources(sourceMapResolve.resolveSources,    false))

test(".resolveSourcesSync", testResolveSources(sourceMapResolve.resolveSourcesSync, true))


function testResolve(method, sync) {
  return function(t) {
    var wrap = (sync ? identity : makePromise)
    t.plan(3)

    if (sync) {
      method = asyncify(method)
    }

    var map = {
      sources: [sourceUrl]
    }
    var read = readTest(t, {
      "built files/operators map.json": JSON.stringify(map),
      "source files/operators:+-<>%.coffee": "source code"
    })

    method(u1(mapUrl), codeUrl, wrap(read), function(error) {
      t.error(error)
    })

  }
}

test(".resolve",     testResolve(sourceMapResolve.resolve,    false))

test(".resolveSync", testResolve(sourceMapResolve.resolveSync, true))
