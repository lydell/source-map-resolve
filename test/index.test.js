'use strict'

const {u1, u2, u3, u4, Throws, identity} = require("./common")

const {
  resolveSourceMap,
  resolveSources,
  resolve,
  parseMapToJSON,
} = require("..")

const map = {
  simple: {
    mappings: "AAAA",
    sources:  ["foo.js"],
    names:    []
  },
  sourceRoot: {
    mappings:   "AAAA",
    sourceRoot: "/static/js/app/",
    sources:    ["foo.js", "lib/bar.js", "../vendor/dom.js", "/version.js", "//foo.org/baz.js"],
    names:      []
  },
  sourceRootNoSlash: {
    mappings:   "AAAA",
    sourceRoot: "/static/js/app",
    sources:    ["foo.js", "lib/bar.js", "../vendor/dom.js", "/version.js", "//foo.org/baz.js"],
    names:      []
  },
  sourceRootEmpty: {
    mappings:   "AAAA",
    sourceRoot: "",
    sources:    ["foo.js", "lib/bar.js", "../vendor/dom.js", "/version.js", "//foo.org/baz.js"],
    names:      []
  },
  sourcesContent: {
    mappings:       "AAAA",
    sourceRoot:     "/static/js/app/",
    sources:        ["foo.js", "lib/bar.js", "../vendor/dom.js", "/version.js", "//foo.org/baz.js"],
    sourcesContent: ["foo.js", "lib/bar.js", "../vendor/dom.js", "/version.js", "//foo.org/baz.js"],
    names:          []
  },
  mixed: {
    mappings:       "AAAA",
    sources:        ["foo.js", "lib/bar.js", "../vendor/dom.js", "/version.js", "//foo.org/baz.js"],
    sourcesContent: ["foo.js", null        , null              , "/version.js", "//foo.org/baz.js"],
    names:          []
  },
  noSources: {
    mappings: "",
    sources:  [],
    names:    []
  },
  utf8 : {
    mappings:       "AAAA",
    sources:        ["foo.js"],
    sourcesContent: ["中文😊"],
    names:          []
  },
  empty: {}
}
map.simpleString = JSON.stringify(map.simple)
map.XSSIsafe = `)]}'${map.simpleString}`

const code = {
  fileRelative:       u1("foo.js.map"),
  domainRelative:     u2("/foo.js.map"),
  schemeRelative:     u3("//foo.org/foo.js.map"),
  absolute:           u4("https://foo.org/foo.js.map"),
  dataUri:            u1("data:application/json," +
                        "%7B%22mappings%22%3A%22AAAA%22%2C%22sources%22%3A%5B%22" +
                        "foo.js%22%5D%2C%22names%22%3A%5B%5D%7D"),
  base64:             u2("data:application/json;base64," +
                        "eyJtYXBwaW5ncyI6IkFBQUEiLCJzb3VyY2VzIjpbImZvby5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyLkuK3mlofwn5iKIl0sIm5hbWVzIjpbXX0="), // jshint ignore:line
  base64InvalidUtf8:  u3("data:application/json;base64,abc"),
  dataUriText:        u4("data:text/json," +
                        "%7B%22mappings%22%3A%22AAAA%22%2C%22sources%22%3A%5B%22" +
                        "foo.js%22%5D%2C%22names%22%3A%5B%5D%7D"),
  dataUriParameter:   u1("data:application/json;charset=UTF-8;foo=bar," +
                        "%7B%22mappings%22%3A%22AAAA%22%2C%22sources%22%3A%5B%22" +
                        "foo.js%22%5D%2C%22names%22%3A%5B%5D%7D"),
  dataUriNoMime:      u2("data:,foo"),
  dataUriInvalidMime: u3("data:text/html,foo"),
  dataUriInvalidJSON: u4("data:application/json,foo"),
  dataUriInvalidCode: u1("data:application/json,%"),
  dataUriXSSIsafe:    u2("data:application/json," + ")%5D%7D%27" +
                        "%7B%22mappings%22%3A%22AAAA%22%2C%22sources%22%3A%5B%22" +
                        "foo.js%22%5D%2C%22names%22%3A%5B%5D%7D"),
  dataUriEmpty:       u3("data:"),
  noMap:              ""
}

describe("resolveSourceMap", () => {
  const codeUrl = "http://example.com/a/b/c/foo.js"

  it("resolves fileRelative", async () => {
    const result = await resolveSourceMap(code.fileRelative, codeUrl, () => map.simpleString)
    expect(result).toStrictEqual({
      sourceMappingURL:  "foo.js.map",
      url:               "http://example.com/a/b/c/foo.js.map",
      sourcesRelativeTo: "http://example.com/a/b/c/foo.js.map",
      map:               map.simple
    })
  })

  it("resolves domainRelative", async () => {
    const result = await resolveSourceMap(code.domainRelative, codeUrl, () => map.simpleString)
    expect(result).toStrictEqual({
      sourceMappingURL:  "/foo.js.map",
      url:               "http://example.com/foo.js.map",
      sourcesRelativeTo: "http://example.com/foo.js.map",
      map:               map.simple
    })
  })

  it("resolves domainRelative with simpleString", async () => {
    const result = await resolveSourceMap(code.schemeRelative, codeUrl, () => map.simpleString)
    expect(result).toStrictEqual({
      sourceMappingURL:  "//foo.org/foo.js.map",
      url:               "http://foo.org/foo.js.map",
      sourcesRelativeTo: "http://foo.org/foo.js.map",
      map:               map.simple
    })
  })

  it("resolves absolute", async () => {
    const result = await resolveSourceMap(code.absolute, codeUrl, () => map.simpleString)
    expect(result).toStrictEqual({
      sourceMappingURL:  "https://foo.org/foo.js.map",
      url:               "https://foo.org/foo.js.map",
      sourcesRelativeTo: "https://foo.org/foo.js.map",
      map:               map.simple
    })
  })

  it("resolves dataUri", async () => {
    const result = await resolveSourceMap(code.dataUri, codeUrl, Throws)
    expect(result).toStrictEqual({
      sourceMappingURL:  "data:application/json," +
                         "%7B%22mappings%22%3A%22AAAA%22%2C%22sources%22%3A%5B%22" +
                         "foo.js%22%5D%2C%22names%22%3A%5B%5D%7D",
      url:               null,
      sourcesRelativeTo: codeUrl,
      map:               map.simple
    })
  })

  it("resolves base64", async () => {
    const result = await resolveSourceMap(code.base64, codeUrl, x => { throw x })
    expect(result).toStrictEqual({
      sourceMappingURL:  "data:application/json;base64," +
                         "eyJtYXBwaW5ncyI6IkFBQUEiLCJzb3VyY2VzIjpbImZvby5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyLkuK3mlofwn5iKIl0sIm5hbWVzIjpbXX0=", // jshint ignore:line
      url:               null,
      sourcesRelativeTo: codeUrl,
      map:               map.utf8
    })
  })

  it("throws on base64InvalidUtf8", async () => {
    try {
      await resolveSourceMap(code.base64InvalidUtf8, codeUrl, Throws)
      throw new Error('Error is expected')
    } catch (error) {
      // TODO: Uncomment when an issue in Jest is resolved
      // https://github.com/facebook/jest/issues/2549
      // expect(error).toBeInstanceOf(TypeError)
      expect(error.sourceMapData).toStrictEqual({
        sourceMappingURL:  "data:application/json;base64,abc",
        url:               null,
        sourcesRelativeTo: codeUrl,
        map:               "abc"
      })
      expect(error.message).not.toBe("data:application/json;base64,abc")
    }
  })

  it("resolves dataUriText", async () => {
    const result = await resolveSourceMap(code.dataUriText, codeUrl, Throws)
    expect(result).toStrictEqual({
      sourceMappingURL:  "data:text/json," +
                         "%7B%22mappings%22%3A%22AAAA%22%2C%22sources%22%3A%5B%22" +
                         "foo.js%22%5D%2C%22names%22%3A%5B%5D%7D",
      url:               null,
      sourcesRelativeTo: codeUrl,
      map:               map.simple
    })
  })

  it("resolves dataUriParameter", async () => {
    const result = await resolveSourceMap(code.dataUriParameter, codeUrl, Throws)
    expect(result).toStrictEqual({
     sourceMappingURL:  "data:application/json;charset=UTF-8;foo=bar," +
                        "%7B%22mappings%22%3A%22AAAA%22%2C%22sources%22%3A%5B%22" +
                        "foo.js%22%5D%2C%22names%22%3A%5B%5D%7D",
      url:               null,
      sourcesRelativeTo: codeUrl,
      map:               map.simple
    })
  })

  it("throws on dataUriNoMime", async () => {
    try {
      await resolveSourceMap(code.dataUriNoMime, codeUrl, Throws)
      throw new Error('Error is expected')
    } catch (error) {
      expect(error.sourceMapData).toStrictEqual({
        sourceMappingURL:  "data:,foo",
        url:               null,
        sourcesRelativeTo: codeUrl,
        map:               "foo"
      })
      expect(error.message).toMatch(/mime type.+text\/plain/)
    }
  })

  it("throws on dataUriInvalidMime", async () => {
    try {
      await resolveSourceMap(code.dataUriInvalidMime, codeUrl, Throws)
      throw new Error('Error is expected')
    } catch (error) {
      expect(error.sourceMapData).toStrictEqual({
        sourceMappingURL:  "data:text/html,foo",
        url:               null,
        sourcesRelativeTo: codeUrl,
        map:               "foo"
      })
      expect(error.message).toMatch(/mime type.+text\/html/)
    }
  })

  it("throws on dataUriInvalidJSON", async () => {
    try {
      await resolveSourceMap(code.dataUriInvalidJSON, codeUrl, Throws)
      throw new Error('Error is expected')
    } catch (error) {
      expect(error.sourceMapData).toStrictEqual({
        sourceMappingURL:  "data:application/json,foo",
        url:               null,
        sourcesRelativeTo: codeUrl,
        map:               "foo"
      })
      expect(error).toBeInstanceOf(SyntaxError)
      expect(error.message).not.toBe("data:application/json,foo")
    }
  })

  it("throws on dataUriInvalidCode", async () => {
    try {
      await resolveSourceMap(code.dataUriInvalidCode, codeUrl, Throws)
      throw new Error('Error is expected')
    } catch (error) {
      expect(error.sourceMapData).toStrictEqual({
        sourceMappingURL:  "data:application/json,%",
        url:               null,
        sourcesRelativeTo: codeUrl,
        map:               "%"
      })
      expect(error).toBeInstanceOf(URIError)
      expect(error.message).not.toBe("data:application/json,%")
    }
  })

  it("resolves dataUriXSSIsafe", async () => {
    const result = await resolveSourceMap(code.dataUriXSSIsafe, codeUrl, Throws)
    expect(result).toStrictEqual({
      sourceMappingURL:  "data:application/json," + ")%5D%7D%27" +
                         "%7B%22mappings%22%3A%22AAAA%22%2C%22sources%22%3A%5B%22" +
                         "foo.js%22%5D%2C%22names%22%3A%5B%5D%7D",
      url:               null,
      sourcesRelativeTo: codeUrl,
      map:               map.simple
    })
  })

  it("throws on dataUriEmpty", async () => {
    try {
      await resolveSourceMap(code.dataUriEmpty, codeUrl, Throws)
      throw new Error('Error is expected')
    } catch (error) {
      expect(error.sourceMapData).toStrictEqual({
        sourceMappingURL:  "data:",
        url:               null,
        sourcesRelativeTo: codeUrl,
        map:               ""
      })
      expect(error.message).toMatch(/mime type.+text\/plain/)
    }
  })

  it("resolves noMap", async () => {
    const result = await resolveSourceMap(code.noMap, codeUrl, Throws)
    expect(result).toBeNull()
  })

  it("resolves absolute with [simpleString]", async () => {
    const result = await resolveSourceMap(code.absolute, codeUrl, () => [map.simpleString])
    expect(result).toStrictEqual({
      sourceMappingURL:  "https://foo.org/foo.js.map",
      url:               "https://foo.org/foo.js.map",
      sourcesRelativeTo: "https://foo.org/foo.js.map",
      map:               map.simple
    })
  })

  it("throws on absolute and invalid JSON", async () => {
    try {
      await resolveSourceMap(code.absolute, codeUrl, () => "invalid JSON")
      throw new Error('Error is expected')
    } catch (error) {
      expect(error.sourceMapData).toStrictEqual({
        sourceMappingURL:  "https://foo.org/foo.js.map",
        url:               "https://foo.org/foo.js.map",
        sourcesRelativeTo: "https://foo.org/foo.js.map",
        map:               "invalid JSON"
      })
      expect(error).toBeInstanceOf(SyntaxError)
    }
  })

  it("resolves absolute XSSIsafe", async () => {
    const result = await resolveSourceMap(code.absolute, codeUrl, () => map.XSSIsafe)
    expect(result).toStrictEqual({
      sourceMappingURL:  "https://foo.org/foo.js.map",
      url:               "https://foo.org/foo.js.map",
      sourcesRelativeTo: "https://foo.org/foo.js.map",
      map:               map.simple
    })
  })

  it("throws on absolute when read throws", async () => {
    try {
      await resolveSourceMap(code.absolute, codeUrl, Throws)
      throw new Error('Error is expected')
    } catch (error) {
      expect(error.sourceMapData).toStrictEqual({
        sourceMappingURL:  "https://foo.org/foo.js.map",
        url:               "https://foo.org/foo.js.map",
        sourcesRelativeTo: "https://foo.org/foo.js.map",
        map:               null
      })
      expect(error.message).toBe("https://foo.org/foo.js.map")
    }
  })
})

describe("resolveSources", () => {
  const mapUrl = "http://example.com/a/b/c/foo.js.map"

  it("resolves simple", async () => {
    const result = await resolveSources(map.simple, mapUrl, identity)
    expect(result).toStrictEqual({
      sourcesResolved: ["http://example.com/a/b/c/foo.js"],
      sourcesContent:  ["http://example.com/a/b/c/foo.js"]
    })
  })

  it("resolves sourceRoot", async () => {
    const result = await resolveSources(map.sourceRoot, mapUrl, identity)
    expect(result).toStrictEqual({
      sourcesResolved: [
        "http://example.com/static/js/app/foo.js",
        "http://example.com/static/js/app/lib/bar.js",
        "http://example.com/static/js/vendor/dom.js",
        "http://example.com/version.js",
        "http://foo.org/baz.js"
      ],
      sourcesContent: [
        "http://example.com/static/js/app/foo.js",
        "http://example.com/static/js/app/lib/bar.js",
        "http://example.com/static/js/vendor/dom.js",
        "http://example.com/version.js",
        "http://foo.org/baz.js"
      ]
    })
  })

  it("resolves sourceRoot with false", async () => {
    const result = await resolveSources(map.sourceRoot, mapUrl, identity, {sourceRoot: false})
    expect(result).toStrictEqual({
      sourcesResolved: [
        "http://example.com/a/b/c/foo.js",
        "http://example.com/a/b/c/lib/bar.js",
        "http://example.com/a/b/vendor/dom.js",
        "http://example.com/version.js",
        "http://foo.org/baz.js"
      ],
      sourcesContent: [
        "http://example.com/a/b/c/foo.js",
        "http://example.com/a/b/c/lib/bar.js",
        "http://example.com/a/b/vendor/dom.js",
        "http://example.com/version.js",
        "http://foo.org/baz.js"
      ]
    })
  })

  it("resolves sourceRoot with options", async () => {
    const result = await resolveSources(
      map.sourceRoot,
      mapUrl,
      identity,
      {sourceRoot: "/static/js/"}
    )
    expect(result).toStrictEqual({
      sourcesResolved: [
        "http://example.com/static/js/foo.js",
        "http://example.com/static/js/lib/bar.js",
        "http://example.com/static/vendor/dom.js",
        "http://example.com/version.js",
        "http://foo.org/baz.js"
      ],
      sourcesContent: [
        "http://example.com/static/js/foo.js",
        "http://example.com/static/js/lib/bar.js",
        "http://example.com/static/vendor/dom.js",
        "http://example.com/version.js",
        "http://foo.org/baz.js"
      ]
    })
  })

  it("resolves sourceRootNoSlash", async () => {
    const result = await resolveSources(map.sourceRootNoSlash, mapUrl, identity)
    expect(result).toStrictEqual({
      sourcesResolved: [
        "http://example.com/static/js/app/foo.js",
        "http://example.com/static/js/app/lib/bar.js",
        "http://example.com/static/js/vendor/dom.js",
        "http://example.com/version.js",
        "http://foo.org/baz.js"
      ],
      sourcesContent: [
        "http://example.com/static/js/app/foo.js",
        "http://example.com/static/js/app/lib/bar.js",
        "http://example.com/static/js/vendor/dom.js",
        "http://example.com/version.js",
        "http://foo.org/baz.js"
      ]
    })
  })

  it("resolves sourceRootEmpty", async () => {
    const result = await resolveSources(map.sourceRootEmpty, mapUrl, identity)
    expect(result).toStrictEqual({
      sourcesResolved: [
        "http://example.com/a/b/c/foo.js",
        "http://example.com/a/b/c/lib/bar.js",
        "http://example.com/a/b/vendor/dom.js",
        "http://example.com/version.js",
        "http://foo.org/baz.js"
      ],
      sourcesContent: [
        "http://example.com/a/b/c/foo.js",
        "http://example.com/a/b/c/lib/bar.js",
        "http://example.com/a/b/vendor/dom.js",
        "http://example.com/version.js",
        "http://foo.org/baz.js"
      ]
    })
  })

  it("resolves sourcesContent", async () => {
    const result = await resolveSources(map.sourcesContent, mapUrl, Throws)
    expect(result).toStrictEqual({
      sourcesResolved: [
        "http://example.com/static/js/app/foo.js",
        "http://example.com/static/js/app/lib/bar.js",
        "http://example.com/static/js/vendor/dom.js",
        "http://example.com/version.js",
        "http://foo.org/baz.js"
      ],
      sourcesContent: [
        "foo.js",
        "lib/bar.js",
        "../vendor/dom.js",
        "/version.js",
        "//foo.org/baz.js"
      ]
    })
  })

  it("resolves mixed", async () => {
    const result = await resolveSources(map.mixed, mapUrl, identity)
    expect(result).toStrictEqual({
      sourcesResolved: [
        "http://example.com/a/b/c/foo.js",
        "http://example.com/a/b/c/lib/bar.js",
        "http://example.com/a/b/vendor/dom.js",
        "http://example.com/version.js",
        "http://foo.org/baz.js"
      ],
      sourcesContent: [
        "foo.js",
        "http://example.com/a/b/c/lib/bar.js",
        "http://example.com/a/b/vendor/dom.js",
        "/version.js",
        "//foo.org/baz.js"
      ]
    })
  })

  it("resolves noSources", async () => {
    const result = await resolveSources(map.noSources, mapUrl, identity)
    expect(result).toStrictEqual({
      sourcesResolved: [],
      sourcesContent: []
    })
  })

  it("resolves empty", async () => {
    const result = await resolveSources(map.empty, mapUrl, identity)
    expect(result).toStrictEqual({
      sourcesResolved: [],
      sourcesContent: []
    })
  })

  it("resolves simple with array", async () => {
    const result = await resolveSources(map.simple, mapUrl, () => ["non", "string"])
    expect(result).toStrictEqual({
      sourcesResolved: ["http://example.com/a/b/c/foo.js"],
      sourcesContent:  ["non,string"]
    })
  })

  it("resolves mixed when read throws", async () => {
    const result = await resolveSources(map.mixed, mapUrl, Throws)
    expect(result.sourcesResolved).toStrictEqual([
      "http://example.com/a/b/c/foo.js",
      "http://example.com/a/b/c/lib/bar.js",
      "http://example.com/a/b/vendor/dom.js",
      "http://example.com/version.js",
      "http://foo.org/baz.js"
    ])
    expect(result.sourcesContent).toStrictEqual([
      "foo.js",
      expect.any(Error),
      expect.any(Error),
      "/version.js",
      "//foo.org/baz.js"
    ])
  })
})

describe("resolve", () => {
  const wrapMap = function (mapFn, fn) {
    return function (url) {
      if (/\.map$/.test(url)) {
        return mapFn(url)
      }
      return fn(url)
    }
  }

  const codeUrl = "http://example.com/a/b/c/foo.js";
  const readSimple = wrapMap(() => map.simpleString, identity);

  it("resolves fileRelative", async () => {
    const result = await resolve(code.fileRelative, codeUrl, readSimple)
    expect(result).toStrictEqual({
      sourceMappingURL:  "foo.js.map",
      url:               "http://example.com/a/b/c/foo.js.map",
      sourcesRelativeTo: "http://example.com/a/b/c/foo.js.map",
      map:               map.simple,
      sourcesResolved:   ["http://example.com/a/b/c/foo.js"],
      sourcesContent:    ["http://example.com/a/b/c/foo.js"]
    })
  })

  it("resolves domainRelative", async () => {
    const result = await resolve(code.domainRelative, codeUrl, readSimple)
    expect(result).toStrictEqual({
      sourceMappingURL:  "/foo.js.map",
      url:               "http://example.com/foo.js.map",
      sourcesRelativeTo: "http://example.com/foo.js.map",
      map:               map.simple,
      sourcesResolved:   ["http://example.com/foo.js"],
      sourcesContent:    ["http://example.com/foo.js"]
    })
  })

  it("resolves schemeRelative", async () => {
    const result = await resolve(code.schemeRelative, codeUrl, readSimple)
    expect(result).toStrictEqual({
      sourceMappingURL:  "//foo.org/foo.js.map",
      url:               "http://foo.org/foo.js.map",
      sourcesRelativeTo: "http://foo.org/foo.js.map",
      map:               map.simple,
      sourcesResolved:   ["http://foo.org/foo.js"],
      sourcesContent:    ["http://foo.org/foo.js"]
    })
  })

  it("resolves absolute", async () => {
    const result = await resolve(code.absolute, codeUrl, readSimple)
    expect(result).toStrictEqual({
      sourceMappingURL:  "https://foo.org/foo.js.map",
      url:               "https://foo.org/foo.js.map",
      sourcesRelativeTo: "https://foo.org/foo.js.map",
      map:               map.simple,
      sourcesResolved:   ["https://foo.org/foo.js"],
      sourcesContent:    ["https://foo.org/foo.js"]
    })
  })

  it("resolves dataUri", async () => {
    const result = await resolve(code.dataUri, codeUrl, wrapMap(Throws, identity))
    expect(result).toStrictEqual({
      sourceMappingURL:  "data:application/json," +
                         "%7B%22mappings%22%3A%22AAAA%22%2C%22sources%22%3A%5B%22" +
                         "foo.js%22%5D%2C%22names%22%3A%5B%5D%7D",
      url:               null,
      sourcesRelativeTo: codeUrl,
      map:               map.simple,
      sourcesResolved:   ["http://example.com/a/b/c/foo.js"],
      sourcesContent:    ["http://example.com/a/b/c/foo.js"]
    })
  })

  it("resolves base64", async () => {
    const result = await resolve(code.base64, codeUrl, wrapMap(Throws, identity))
    expect(result).toStrictEqual({
      sourceMappingURL:  "data:application/json;base64," +
                         "eyJtYXBwaW5ncyI6IkFBQUEiLCJzb3VyY2VzIjpbImZvby5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyLkuK3mlofwn5iKIl0sIm5hbWVzIjpbXX0=", // jshint ignore:line
      url:               null,
      sourcesRelativeTo: codeUrl,
      map:               map.utf8,
      sourcesResolved:   ["http://example.com/a/b/c/foo.js"],
      sourcesContent:    ["中文😊"]
    })
  })

  it("throws on base64InvalidUtf8", async () => {
    try {
      await resolve(code.base64InvalidUtf8, codeUrl, Throws)
      throw new Error('Error is expected')
    } catch (error) {
      expect(error.sourceMapData).toStrictEqual({
        sourceMappingURL:  "data:application/json;base64,abc",
        url:               null,
        sourcesRelativeTo: codeUrl,
        map:               "abc"
      })
      // expect(error).toBeInstanceOf(TypeError)
      expect(error.message).not.toBe("data:application/json;base64,abc")
    }
  })

  it("resolves dataUriText", async () => {
    const result = await resolve(code.dataUriText, codeUrl, wrapMap(Throws, identity))
    expect(result).toStrictEqual({
      sourceMappingURL:  "data:text/json," +
                         "%7B%22mappings%22%3A%22AAAA%22%2C%22sources%22%3A%5B%22" +
                         "foo.js%22%5D%2C%22names%22%3A%5B%5D%7D",
      url:               null,
      sourcesRelativeTo: codeUrl,
      map:               map.simple,
      sourcesResolved:   ["http://example.com/a/b/c/foo.js"],
      sourcesContent:    ["http://example.com/a/b/c/foo.js"]
    })
  })

  it("resolves dataUriParameter", async () => {
    const result = await resolve(code.dataUriParameter, codeUrl, wrapMap(Throws, identity))
    expect(result).toStrictEqual({
      sourceMappingURL:  "data:application/json;charset=UTF-8;foo=bar," +
                         "%7B%22mappings%22%3A%22AAAA%22%2C%22sources%22%3A%5B%22" +
                         "foo.js%22%5D%2C%22names%22%3A%5B%5D%7D",
      url:               null,
      sourcesRelativeTo: codeUrl,
      map:               map.simple,
      sourcesResolved:   ["http://example.com/a/b/c/foo.js"],
      sourcesContent:    ["http://example.com/a/b/c/foo.js"]
    })
  })

  it("throws on dataUriNoMime", async () => {
    try {
      await resolve(code.dataUriNoMime, codeUrl, Throws)
      throw new Error('Error is expected')
    } catch (error) {
      expect(error.sourceMapData).toStrictEqual({
        sourceMappingURL:  "data:,foo",
        url:               null,
        sourcesRelativeTo: codeUrl,
        map:               "foo"
      })
      expect(error.message).toMatch(/mime type.+text\/plain/)
    }
  })

  it("throws on dataUriInvalidMime", async () => {
    try {
      await resolve(code.dataUriInvalidMime, codeUrl, Throws)
      throw new Error('Error is expected')
    } catch (error) {
      expect(error.sourceMapData).toStrictEqual({
        sourceMappingURL:  "data:text/html,foo",
        url:               null,
        sourcesRelativeTo: codeUrl,
        map:               "foo"
      })
      expect(error.message).toMatch(/mime type.+text\/html/)
    }
  })

  it("throws on dataUriInvalidJSON", async () => {
    try {
      await resolve(code.dataUriInvalidJSON, codeUrl, Throws)
      throw new Error('Error is expected')
    } catch (error) {
      expect(error.sourceMapData).toStrictEqual({
        sourceMappingURL:  "data:application/json,foo",
        url:               null,
        sourcesRelativeTo: codeUrl,
        map:               "foo"
      })
      expect(error).toBeInstanceOf(SyntaxError)
      expect(error.message).not.toBe("data:application/json,foo")
    }
  })

  it("throws on dataUriInvalidCode", async () => {
    try {
      await resolve(code.dataUriInvalidCode, codeUrl, Throws)
      throw new Error('Error is expected')
    } catch (error) {
      expect(error.sourceMapData).toStrictEqual({
        sourceMappingURL:  "data:application/json,%",
        url:               null,
        sourcesRelativeTo: codeUrl,
        map:               "%"
      })
      expect(error).toBeInstanceOf(URIError)
      expect(error.message).not.toBe("data:application/json,%")
    }
  })

  it("resolves dataUriXSSIsafe", async () => {
    const result = await resolve(code.dataUriXSSIsafe, codeUrl, wrapMap(Throws, identity))
    expect(result).toStrictEqual({
      sourceMappingURL:  "data:application/json," + ")%5D%7D%27" +
                         "%7B%22mappings%22%3A%22AAAA%22%2C%22sources%22%3A%5B%22" +
                         "foo.js%22%5D%2C%22names%22%3A%5B%5D%7D",
      url:               null,
      sourcesRelativeTo: codeUrl,
      map:               map.simple,
      sourcesResolved:   ["http://example.com/a/b/c/foo.js"],
      sourcesContent:    ["http://example.com/a/b/c/foo.js"]
    })
  })

  it("throws on dataUriEmpty", async () => {
    try {
      await resolve(code.dataUriEmpty, codeUrl, Throws)
      throw new Error('Error is expected')
    } catch (error) {
      expect(error.sourceMapData).toStrictEqual({
        sourceMappingURL:  "data:",
        url:               null,
        sourcesRelativeTo: codeUrl,
        map:               ""
      })
      expect(error.message).toMatch(/mime type.+text\/plain/)
    }
  })

  it("returns null for noMap", async () => {
    const result = await resolve(code.noMap, codeUrl, Throws)
    expect(result).toBeNull()
  })

  it("resolves absolute with simpleString", async () => {
    const result = await resolve(code.absolute, codeUrl, () => [map.simpleString])
    expect(result).toStrictEqual({
      sourceMappingURL:  "https://foo.org/foo.js.map",
      url:               "https://foo.org/foo.js.map",
      sourcesRelativeTo: "https://foo.org/foo.js.map",
      map:               map.simple,
      sourcesResolved:   ["https://foo.org/foo.js"],
      sourcesContent:    [map.simpleString]
    })
  })

  it("throws on absolute with invalid JSON", async () => {
    try {
      await resolve(code.absolute, codeUrl, () => "invalid JSON")
      throw new Error('Error is expected')
    } catch (error) {
      expect(error.sourceMapData).toStrictEqual({
        sourceMappingURL:  "https://foo.org/foo.js.map",
        url:               "https://foo.org/foo.js.map",
        sourcesRelativeTo: "https://foo.org/foo.js.map",
        map:               "invalid JSON"
      })
      expect(error).toBeInstanceOf(SyntaxError)
    }
  })

  it("resolves absolute with unsafe map", async () => {
    const result = await resolve(code.absolute, codeUrl, wrapMap(() => map.XSSIsafe, identity))
    expect(result).toStrictEqual({
      sourceMappingURL:  "https://foo.org/foo.js.map",
      url:               "https://foo.org/foo.js.map",
      sourcesRelativeTo: "https://foo.org/foo.js.map",
      map:               map.simple,
      sourcesResolved:   ["https://foo.org/foo.js"],
      sourcesContent:    ["https://foo.org/foo.js"]
    })
  })

  it("throws on absolute when read throws", async () => {
    try {
      await resolve(code.absolute, codeUrl, Throws)
      throw new Error('Error is expected')
    } catch (error) {
      expect(error.sourceMapData).toStrictEqual({
        sourceMappingURL:  "https://foo.org/foo.js.map",
        url:               "https://foo.org/foo.js.map",
        sourcesRelativeTo: "https://foo.org/foo.js.map",
        map:               null
      })
      expect(error.message).toBe("https://foo.org/foo.js.map")
    }
  })

  function readMap(what) {
    return wrapMap(() => JSON.stringify(what), identity)
  }

  it("resolves fileRelative with simple map", async () => {
    const result = await resolve(code.fileRelative, codeUrl, readMap(map.simple))
    expect(result.sourcesResolved).toStrictEqual(["http://example.com/a/b/c/foo.js"])
    expect(result.sourcesContent).toStrictEqual(["http://example.com/a/b/c/foo.js"])
  })

  it("resolves fileRelative with sourceRoot map", async () => {
    const result = await resolve(code.fileRelative, codeUrl, readMap(map.sourceRoot))
    expect(result.sourcesResolved).toStrictEqual([
      "http://example.com/static/js/app/foo.js",
      "http://example.com/static/js/app/lib/bar.js",
      "http://example.com/static/js/vendor/dom.js",
      "http://example.com/version.js",
      "http://foo.org/baz.js"
    ])
    expect(result.sourcesContent).toStrictEqual([
      "http://example.com/static/js/app/foo.js",
      "http://example.com/static/js/app/lib/bar.js",
      "http://example.com/static/js/vendor/dom.js",
      "http://example.com/version.js",
      "http://foo.org/baz.js"
    ])
  })

  it("resolves fileRelative with sourceRoot map and options = false", async () => {
    const result = await resolve(
      code.fileRelative,
      codeUrl,
      readMap(map.sourceRoot),
      {sourceRoot: false}
    )
    expect(result.sourcesResolved).toStrictEqual([
      "http://example.com/a/b/c/foo.js",
      "http://example.com/a/b/c/lib/bar.js",
      "http://example.com/a/b/vendor/dom.js",
      "http://example.com/version.js",
      "http://foo.org/baz.js"
    ])
    expect(result.sourcesContent).toStrictEqual([
      "http://example.com/a/b/c/foo.js",
      "http://example.com/a/b/c/lib/bar.js",
      "http://example.com/a/b/vendor/dom.js",
      "http://example.com/version.js",
      "http://foo.org/baz.js"
    ])
  })

  it("resolves fileRelative with sourceRoot map and a path in an option", async () => {
    const result = await resolve(
      code.fileRelative,
      codeUrl,
      readMap(map.sourceRoot),
      {sourceRoot: "/static/js/"}
    )
    expect(result.sourcesResolved).toStrictEqual([
      "http://example.com/static/js/foo.js",
      "http://example.com/static/js/lib/bar.js",
      "http://example.com/static/vendor/dom.js",
      "http://example.com/version.js",
      "http://foo.org/baz.js"
    ])
    expect(result.sourcesContent).toStrictEqual([
      "http://example.com/static/js/foo.js",
      "http://example.com/static/js/lib/bar.js",
      "http://example.com/static/vendor/dom.js",
      "http://example.com/version.js",
      "http://foo.org/baz.js"
    ])
  })

  it("resolves fileRelative with sourceRootNoSlash map", async () => {
    const result = await resolve(code.fileRelative, codeUrl, readMap(map.sourceRootNoSlash))
    expect(result.sourcesResolved).toStrictEqual([
      "http://example.com/static/js/app/foo.js",
      "http://example.com/static/js/app/lib/bar.js",
      "http://example.com/static/js/vendor/dom.js",
      "http://example.com/version.js",
      "http://foo.org/baz.js"
    ])
    expect(result.sourcesContent).toStrictEqual([
      "http://example.com/static/js/app/foo.js",
      "http://example.com/static/js/app/lib/bar.js",
      "http://example.com/static/js/vendor/dom.js",
      "http://example.com/version.js",
      "http://foo.org/baz.js"
    ])
  })

  it("resolves fileRelative with sourceRootEmpty map", async () => {
    const result = await resolve(code.fileRelative, codeUrl, readMap(map.sourceRootEmpty))
    expect(result.sourcesResolved).toStrictEqual([
      "http://example.com/a/b/c/foo.js",
      "http://example.com/a/b/c/lib/bar.js",
      "http://example.com/a/b/vendor/dom.js",
      "http://example.com/version.js",
      "http://foo.org/baz.js"
    ])
    expect(result.sourcesContent).toStrictEqual([
      "http://example.com/a/b/c/foo.js",
      "http://example.com/a/b/c/lib/bar.js",
      "http://example.com/a/b/vendor/dom.js",
      "http://example.com/version.js",
      "http://foo.org/baz.js"
    ])
  })

  it("resolves fileRelative with sourcesContent map", async () => {
    const result = await resolve(code.fileRelative, codeUrl, readMap(map.sourcesContent))
    expect(result.sourcesResolved).toStrictEqual([
      "http://example.com/static/js/app/foo.js",
      "http://example.com/static/js/app/lib/bar.js",
      "http://example.com/static/js/vendor/dom.js",
      "http://example.com/version.js",
      "http://foo.org/baz.js"
    ])
    expect(result.sourcesContent).toStrictEqual([
      "foo.js",
      "lib/bar.js",
      "../vendor/dom.js",
      "/version.js",
      "//foo.org/baz.js"
    ])
  })

  it("resolves fileRelative with mixed map", async () => {
    const result = await resolve(code.fileRelative, codeUrl, readMap(map.mixed))
    expect(result.sourcesResolved).toStrictEqual([
      "http://example.com/a/b/c/foo.js",
      "http://example.com/a/b/c/lib/bar.js",
      "http://example.com/a/b/vendor/dom.js",
      "http://example.com/version.js",
      "http://foo.org/baz.js"
    ])
    expect(result.sourcesContent).toStrictEqual([
      "foo.js",
      "http://example.com/a/b/c/lib/bar.js",
      "http://example.com/a/b/vendor/dom.js",
      "/version.js",
      "//foo.org/baz.js"
    ])
  })

  it("resolves fileRelative with noSources map", async () => {
    const result = await resolve(code.fileRelative, codeUrl, readMap(map.noSources))
    expect(result.sourcesResolved).toStrictEqual([])
    expect(result.sourcesContent).toStrictEqual([])
  })

  it("resolves fileRelative with empty map", async () => {
    const result = await resolve(code.fileRelative, codeUrl, readMap(map.empty))
    expect(result.sourcesResolved).toStrictEqual([])
    expect(result.sourcesContent).toStrictEqual([])
  })

  it("resolves fileRelative with simple string", async () => {
    const result = await resolve(code.fileRelative, codeUrl, () => [map.simpleString])
    expect(result.sourcesResolved).toStrictEqual(["http://example.com/a/b/c/foo.js"])
    expect(result.sourcesContent).toStrictEqual([map.simpleString])
  })

  function ThrowsMap(what) {
    return wrapMap(() => JSON.stringify(what), Throws)
  }

  it("resolves fileRelative with throwed map", async () => {
    const result = await resolve(code.fileRelative, codeUrl, ThrowsMap(map.mixed))
    expect(result.sourcesResolved).toStrictEqual([
      "http://example.com/a/b/c/foo.js",
      "http://example.com/a/b/c/lib/bar.js",
      "http://example.com/a/b/vendor/dom.js",
      "http://example.com/version.js",
      "http://foo.org/baz.js"
    ])
    expect(result.sourcesContent).toStrictEqual([
      "foo.js",
      expect.any(Error),
      expect.any(Error),
      "/version.js",
      "//foo.org/baz.js"
    ])
  })

  describe("mapUrl = foo.org", () => {
    const mapUrl = "https://foo.org/foo.js.map"

    it("resolves null", async () => {
      const result = await resolve(null, mapUrl, readSimple)
      expect(result).toStrictEqual({
        sourceMappingURL:  null,
        url:               "https://foo.org/foo.js.map",
        sourcesRelativeTo: "https://foo.org/foo.js.map",
        map:               map.simple,
        sourcesResolved:   ["https://foo.org/foo.js"],
        sourcesContent:    ["https://foo.org/foo.js"]
      })
    })

    it("resolves null with simpleString", async () => {
      const result = await resolve(null, mapUrl, () => [map.simpleString])
      expect(result).toStrictEqual({
        sourceMappingURL:  null,
        url:               "https://foo.org/foo.js.map",
        sourcesRelativeTo: "https://foo.org/foo.js.map",
        map:               map.simple,
        sourcesResolved:   ["https://foo.org/foo.js"],
        sourcesContent:    [map.simpleString]
      })
    })

    it("throws on null and invalid JSON", async () => {
      try {
        await resolve(null, mapUrl, () => "invalid JSON")
        throw new Error('Error is expected')
      } catch (error) {
        expect(error.sourceMapData).toStrictEqual({
          sourceMappingURL:  null,
          url:               "https://foo.org/foo.js.map",
          sourcesRelativeTo: "https://foo.org/foo.js.map",
          map:               "invalid JSON"
        })
        expect(error).toBeInstanceOf(SyntaxError)
      }
    })

    it("resolves null with unsafe map", async () => {
      const result = await resolve(null, mapUrl, wrapMap(() => map.XSSIsafe, identity))
      expect(result).toStrictEqual({
        sourceMappingURL:  null,
        url:               "https://foo.org/foo.js.map",
        sourcesRelativeTo: "https://foo.org/foo.js.map",
        map:               map.simple,
        sourcesResolved:   ["https://foo.org/foo.js"],
        sourcesContent:    ["https://foo.org/foo.js"]
      })
    })

    it("throws on null when read throws", async () => {
      try {
        await resolve(null, mapUrl, Throws)
        throw new Error('Error is expected')
      } catch (error) {
        expect(error.sourceMapData).toStrictEqual({
          sourceMappingURL:  null,
          url:               "https://foo.org/foo.js.map",
          sourcesRelativeTo: "https://foo.org/foo.js.map",
          map:               null
        })
        expect(error.message).toBe("https://foo.org/foo.js.map")
      }
    })
  })

  describe("mapUrl = example.com", () => {
    const mapUrl = "http://example.com/a/b/c/foo.js.map"

    it("resolves null with sourceRoot map and a path in an option", async () => {
      const result = await resolve(
        null,
        mapUrl,
        readMap(map.sourceRoot),
        {sourceRoot: "/static/js/"}
      )
      expect(result.sourcesResolved).toStrictEqual([
        "http://example.com/static/js/foo.js",
        "http://example.com/static/js/lib/bar.js",
        "http://example.com/static/vendor/dom.js",
        "http://example.com/version.js",
        "http://foo.org/baz.js"
      ])
      expect(result.sourcesContent).toStrictEqual([
        "http://example.com/static/js/foo.js",
        "http://example.com/static/js/lib/bar.js",
        "http://example.com/static/vendor/dom.js",
        "http://example.com/version.js",
        "http://foo.org/baz.js"
      ])
    })

    it("resolves null with mixed map", async () => {
      const result = await resolve(null, mapUrl, readMap(map.mixed))
      expect(result.sourcesResolved).toStrictEqual([
        "http://example.com/a/b/c/foo.js",
        "http://example.com/a/b/c/lib/bar.js",
        "http://example.com/a/b/vendor/dom.js",
        "http://example.com/version.js",
        "http://foo.org/baz.js"
      ])
      expect(result.sourcesContent).toStrictEqual([
        "foo.js",
        "http://example.com/a/b/c/lib/bar.js",
        "http://example.com/a/b/vendor/dom.js",
        "/version.js",
        "//foo.org/baz.js"
      ])
    })
  })
})

describe("parseMapToJSON", () => {
  it("parses unsafe JSON", () => {
    expect(parseMapToJSON(map.XSSIsafe)).toStrictEqual(map.simple)
  })
})
