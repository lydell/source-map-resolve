const path = require("path")
const {u1, u2, u3, identity} = require("./common")
const {
  resolveSourceMap,
  resolveSources,
  resolve,
} = require("..")

path.sep = "\\"

describe('Windows: resolveSourceMap', function() {
  var codeUrl = "c:\\a\\b\\c\\foo.js"
  var map = {}
  var readMap = () => JSON.stringify(map)

  it('resolves u1', async function() {
    const result = await resolveSourceMap(u1("foo.js.map"), codeUrl, readMap)
    expect(result).toStrictEqual({
      sourceMappingURL:  "foo.js.map",
      url:               "/a/b/c/foo.js.map",
      sourcesRelativeTo: "/a/b/c/foo.js.map",
      map:               map
    })
  })

  it('resolves u2', async function() {
    const result = await resolveSourceMap(u2("/foo.js.map"), codeUrl, readMap)
    expect(result).toStrictEqual({
      sourceMappingURL:  "/foo.js.map",
      url:               "/foo.js.map",
      sourcesRelativeTo: "/foo.js.map",
      map:               map
    })
  })

  it('resolves u2', async function() {
    const result = await resolveSourceMap(u3("../foo.js.map"), codeUrl, readMap)
    expect(result).toStrictEqual({
      sourceMappingURL:  "../foo.js.map",
      url:               "/a/b/foo.js.map",
      sourcesRelativeTo: "/a/b/foo.js.map",
      map:               map
    })
  })
})

describe('Windows: resolveSources', function() {
  const mapUrl = "c:\\a\\b\\c\\foo.js.map"

  const map = {
    sources: ["foo.js", "/foo.js", "../foo.js"]
  }

  it('resolves a map', async function() {
    const result = await resolveSources(map, mapUrl, identity)
    expect(result.sourcesResolved).toStrictEqual(["/a/b/c/foo.js", "/foo.js", "/a/b/foo.js"])
    expect(result.sourcesContent).toStrictEqual(["/a/b/c/foo.js", "/foo.js", "/a/b/foo.js"])
  })
})

describe('Windows: resolve', function() {
  const codeUrl = "c:\\a\\b\\c\\foo.js"

  const map = {
    sources: ["foo.js", "/foo.js", "../foo.js"]
  }

  const readMap = function(url) {
    if (/\.map$/.test(url)) {
      return JSON.stringify(map)
    }
    return url
  }

  it('resolves u1', async function() {
    const result = await resolve(u1("foo.js.map"), codeUrl, readMap)
    expect(result).toStrictEqual({
      sourceMappingURL:  "foo.js.map",
      url:               "/a/b/c/foo.js.map",
      sourcesRelativeTo: "/a/b/c/foo.js.map",
      map:               map,
      sourcesResolved:   ["/a/b/c/foo.js", "/foo.js", "/a/b/foo.js"],
      sourcesContent:    ["/a/b/c/foo.js", "/foo.js", "/a/b/foo.js"]
    })
  })

  it('resolves u2', async function() {
    const result = await resolve(u2("/foo.js.map"), codeUrl, readMap)
    expect(result).toStrictEqual({
      sourceMappingURL:  "/foo.js.map",
      url:               "/foo.js.map",
      sourcesRelativeTo: "/foo.js.map",
      map:               map,
      sourcesResolved:   ["/foo.js", "/foo.js", "/foo.js"],
      sourcesContent:    ["/foo.js", "/foo.js", "/foo.js"]
    })
  })

  it('resolves u3', async function() {
    const result = await resolve(u3("../foo.js.map"), codeUrl, readMap)
    expect(result).toStrictEqual({
      sourceMappingURL:  "../foo.js.map",
      url:               "/a/b/foo.js.map",
      sourcesRelativeTo: "/a/b/foo.js.map",
      map:               map,
      sourcesResolved:   ["/a/b/foo.js", "/foo.js", "/a/foo.js"],
      sourcesContent:    ["/a/b/foo.js", "/foo.js", "/a/foo.js"]
    })
  })
})
