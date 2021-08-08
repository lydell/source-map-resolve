import urlLib from "node:url"
import pathLib from "node:path"
import _atob from "atob"
import decodeUriComponentLib from "decode-uri-component"

/** @type {globalThis.atob} */
const atob = globalThis.atob || _atob

/** @param {any[]} args ...urls */
function resolveUrl(...args) {
  return Array.prototype.reduce.call(args, (resolved, nextUrl) => {
    return urlLib.resolve(resolved, nextUrl)
  })
}

/** @param {string} aPath */
function convertWindowsPath(aPath) {
  return pathLib.sep === "\\" ? aPath.replace(/\\/g, "/").replace(/^[a-z]:\/?/i, "/") : aPath
}

/**
 * @param {string} string
 * @returns {string}
 */
function customDecodeUriComponent(string) {
  // `decodeUriComponentLib` turns `+` into ` `, but that's not wanted.
  return decodeUriComponentLib(string.replace(/\+/g, "%2B"))
}

function callbackAsync(callback, error, result) {
  setImmediate(() => { callback(error, result) })
}

/**
 * @param {string} string
 * @returns {string}
 */
function parseMapToJSON(string, data) {
  try {
    return JSON.parse(string.replace(/^\)\]\}'/, ""))
  } catch (error) {
    error.sourceMapData = data
    throw error
  }
}

function readSync(read, url, data) {
  const readUrl = customDecodeUriComponent(url)
  try {
    return String(read(readUrl))
  } catch (error) {
    error.sourceMapData = data
    throw error
  }
}

const innerRegex = /[#@] sourceMappingURL=([^\s'"]*)/

const sourceMappingURLRegex = RegExp(
  `(?:/\\*(?:\\s*\r?\n(?://)?)?(?:${innerRegex.source})\\s*\\*/|//(?:${innerRegex.source}))\\s*`
)

function getSourceMappingUrl(code) {
  const match = code.match(sourceMappingURLRegex)
  return match ? match[1] || match[2] || "" : null
}

function resolveSourceMap(code, codeUrl, read, callback) {
  let mapData
  try {
    mapData = resolveSourceMapHelper(code, codeUrl)
  } catch (error) {
    return callbackAsync(callback, error)
  }
  if (!mapData || mapData.map) {
    return callbackAsync(callback, null, mapData)
  }
  const readUrl = customDecodeUriComponent(mapData.url)
  read(readUrl, (error, result) => {
    if (error) {
      error.sourceMapData = mapData
      return callback(error)
    }
    mapData.map = String(result)
    try {
      mapData.map = parseMapToJSON(mapData.map, mapData)
    } catch (error) {
      return callback(error)
    }
    callback(null, mapData)
  })
}

function resolveSourceMapSync(code, codeUrl, read) {
  const mapData = resolveSourceMapHelper(code, codeUrl)
  if (!mapData || mapData.map) {
    return mapData
  }
  mapData.map = readSync(read, mapData.url, mapData)
  mapData.map = parseMapToJSON(mapData.map, mapData)
  return mapData
}

const dataUriRegex = /^data:([^,;]*)(;[^,;]*)*(?:,(.*))?$/

/**
 * The media type for JSON text is application/json.
 *
 * {@link https://tools.ietf.org/html/rfc8259#section-11 | IANA Considerations }
 *
 * `text/json` is non-standard media type
 */
const jsonMimeTypeRegex = /^(?:application|text)\/json$/

/**
 * JSON text exchanged between systems that are not part of a closed ecosystem
 * MUST be encoded using UTF-8.
 *
 * {@link https://tools.ietf.org/html/rfc8259#section-8.1 | Character Encoding}
 */
const jsonCharacterEncoding = "utf-8"

/** @param {string} b64 */
function base64ToBuf(b64) {
  const binStr = atob(b64)
  const len = binStr.length
  const arr = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    arr[i] = binStr.charCodeAt(i)
  }
  return arr
}

/** @param {string} b64 */
function decodeBase64String(b64) {
  if (typeof TextDecoder === "undefined" || typeof Uint8Array === "undefined") {
    return atob(b64)
  }
  const buf = base64ToBuf(b64)
  // Note: `decoder.decode` method will throw a `DOMException` with the
  // `"EncodingError"` value when an coding error is found.
  const decoder = new TextDecoder(jsonCharacterEncoding, {fatal: true})
  return decoder.decode(buf)
}

/**
 * @param {*} code
 * @param {string} codeUrl
 */
function resolveSourceMapHelper(code, codeUrl) {
  codeUrl = convertWindowsPath(codeUrl)

  const url = getSourceMappingUrl(code)
  if (!url) {
    return null
  }

  const dataUri = url.match(dataUriRegex)
  if (dataUri) {
    const mimeType = dataUri[1] || "text/plain"
    const lastParameter = dataUri[2] || ""
    const encoded = dataUri[3] || ""
    const data = {
      sourceMappingURL: url,
      url: null,
      sourcesRelativeTo: codeUrl,
      map: encoded
    }
    if (!jsonMimeTypeRegex.test(mimeType)) {
      var error = new Error(`Unuseful data uri mime type: ${mimeType}`)
      error.sourceMapData = data
      throw error
    }
    try {
      data.map = parseMapToJSON(
        lastParameter === ";base64" ? decodeBase64String(encoded) : decodeURIComponent(encoded),
        data
      )
    } catch (error) {
      error.sourceMapData = data
      throw error
    }
    return data
  }

  const mapUrl = resolveUrl(codeUrl, url)

  return {
    sourceMappingURL: url,
    url: mapUrl,
    sourcesRelativeTo: mapUrl,
    map: null
  }
}

function resolveSources(map, mapUrl, read, options, callback) {
  if (typeof options === "function") {
    callback = options
    options = {}
  }
  let pending = map.sources ? map.sources.length : 0;
  const result = {
    sourcesResolved: [],
    sourcesContent:  []
  };

  if (pending === 0) {
    callbackAsync(callback, null, result)
    return
  }

  const done = () => {
    pending--
    if (pending === 0) {
      callback(null, result)
    }
  };

  resolveSourcesHelper(map, mapUrl, options, (fullUrl, sourceContent, index) => {
    result.sourcesResolved[index] = fullUrl
    if (typeof sourceContent === "string") {
      result.sourcesContent[index] = sourceContent
      callbackAsync(done, null)
    } else {
      const readUrl = customDecodeUriComponent(fullUrl);
      read(readUrl, (error, source) => {
        result.sourcesContent[index] = error ? error : String(source)
        done()
      })
    }
  })
}

function resolveSourcesSync(map, mapUrl, read, options) {
  const result = {
    sourcesResolved: [],
    sourcesContent:  []
  }

  if (!map.sources || map.sources.length === 0) {
    return result
  }

  resolveSourcesHelper(map, mapUrl, options, (fullUrl, sourceContent, index) => {
    result.sourcesResolved[index] = fullUrl
    if (read !== null) {
      if (typeof sourceContent === "string") {
        result.sourcesContent[index] = sourceContent
      } else {
        const readUrl = customDecodeUriComponent(fullUrl)
        try {
          result.sourcesContent[index] = String(read(readUrl))
        } catch (error) {
          result.sourcesContent[index] = error
        }
      }
    }
  })

  return result
}

const endingSlash = /\/?$/

function resolveSourcesHelper(map, mapUrl, options, fn) {
  options = options || {}
  mapUrl = convertWindowsPath(mapUrl)
  let fullUrl
  let sourceContent
  let sourceRoot
  for (let index = 0, len = map.sources.length; index < len; index++) {
    sourceRoot = null
    if (typeof options.sourceRoot === "string") {
      sourceRoot = options.sourceRoot
    } else if (typeof map.sourceRoot === "string" && options.sourceRoot !== false) {
      sourceRoot = map.sourceRoot
    }
    // If the sourceRoot is the empty string, it is equivalent to not setting
    // the property at all.
    if (sourceRoot === null || sourceRoot === '') {
      fullUrl = resolveUrl(mapUrl, map.sources[index])
    } else {
      // Make sure that the sourceRoot ends with a slash, so that `/scripts/subdir` becomes
      // `/scripts/subdir/<source>`, not `/scripts/<source>`. Pointing to a file as source root
      // does not make sense.
      fullUrl = resolveUrl(mapUrl, sourceRoot.replace(endingSlash, "/"), map.sources[index])
    }
    sourceContent = (map.sourcesContent || [])[index]
    fn(fullUrl, sourceContent, index)
  }
}

function resolve(code, codeUrl, read, options, callback) {
  if (typeof options === "function") {
    callback = options
    options = {}
  }
  if (code === null) {
    const mapUrl = codeUrl
    const data = {
      sourceMappingURL: null,
      url: mapUrl,
      sourcesRelativeTo: mapUrl,
      map: null
    }
    const readUrl = customDecodeUriComponent(mapUrl)
    read(readUrl, (error, result) => {
      if (error) {
        error.sourceMapData = data
        return callback(error)
      }
      data.map = String(result)
      try {
        data.map = parseMapToJSON(data.map, data)
      } catch (error) {
        return callback(error)
      }
      _resolveSources(data)
    })
  } else {
    resolveSourceMap(code, codeUrl, read, (error, mapData) => {
      if (error) {
        return callback(error)
      }
      if (!mapData) {
        return callback(null, null)
      }
      _resolveSources(mapData)
    })
  }

  function _resolveSources(mapData) {
    resolveSources(mapData.map, mapData.sourcesRelativeTo, read, options, (error, result) => {
      if (error) {
        return callback(error)
      }
      mapData.sourcesResolved = result.sourcesResolved
      mapData.sourcesContent  = result.sourcesContent
      callback(null, mapData)
    })
  }
}

function resolveSync(code, codeUrl, read, options) {
  let mapData
  if (code === null) {
    const mapUrl = codeUrl
    mapData = {
      sourceMappingURL: null,
      url: mapUrl,
      sourcesRelativeTo: mapUrl,
      map: null
    }
    mapData.map = readSync(read, mapUrl, mapData)
    mapData.map = parseMapToJSON(mapData.map, mapData)
  } else {
    mapData = resolveSourceMapSync(code, codeUrl, read)
    if (!mapData) {
      return null
    }
  }
  const result = resolveSourcesSync(mapData.map, mapData.sourcesRelativeTo, read, options);
  mapData.sourcesResolved = result.sourcesResolved
  mapData.sourcesContent  = result.sourcesContent
  return mapData
}

export default {
  resolveSourceMap,
  resolveSourceMapSync,
  resolveSources,
  resolveSourcesSync,
  resolve,
  resolveSync,
  parseMapToJSON
}
