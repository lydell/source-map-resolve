'use strict'

const atob = require("atob")
const urlLib = require("url")
const pathLib = require("path")
const decodeUriComponentLib = require("decode-uri-component")



function resolveUrl(...urls) {
  return urls.reduce((resolved, nextUrl) => urlLib.resolve(resolved, nextUrl))
}

function convertWindowsPath(aPath) {
  return pathLib.sep === "\\" ? aPath.replace(/\\/g, "/").replace(/^[a-z]:\/?/i, "/") : aPath
}

function customDecodeUriComponent(string) {
  // `decodeUriComponentLib` turns `+` into ` `, but that's not wanted.
  return decodeUriComponentLib(string.replace(/\+/g, "%2B"))
}

function parseMapToJSON(string, data) {
  try {
    return JSON.parse(string.replace(/^\)\]\}'/, ""))
  } catch (error) {
    error.sourceMapData = data
    throw error
  }
}


const innerRegex = /[#@] sourceMappingURL=([^\s'"]*)/

/* eslint-disable prefer-template */
const sourceMappingURLRegex = RegExp(
  "(?:" +
    "/\\*" +
    "(?:\\s*\r?\n(?://)?)?" +
    "(?:" + innerRegex.source + ")" +
    "\\s*" +
    "\\*/" +
    "|" +
    "//(?:" + innerRegex.source + ")" +
  ")" +
  "\\s*"
)
/* eslint-enable prefer-template */

function getSourceMappingUrl(code) {
  const match = code.match(sourceMappingURLRegex)
  return match ? match[1] || match[2] || "" : null
}



async function resolveSourceMap(code, codeUrl, read) {
  const mapData = resolveSourceMapHelper(code, codeUrl)

  if (!mapData || mapData.map) {
    return mapData
  }
  const readUrl = customDecodeUriComponent(mapData.url)
  try {
    const result = await read(readUrl)
    mapData.map = String(result)
    mapData.map = parseMapToJSON(mapData.map, mapData)
    return mapData
  } catch (error) {
    error.sourceMapData = mapData
    throw error
  }
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

function base64ToBuf(b64) {
  const binStr = atob(b64)
  const len = binStr.length
  const arr = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    arr[i] = binStr.charCodeAt(i)
  }
  return arr
}

function decodeBase64String(b64) {
  if (typeof TextDecoder === "undefined" || typeof Uint8Array === "undefined") {
    return atob(b64)
  }
  const buf = base64ToBuf(b64);
  // Note: `decoder.decode` method will throw a `DOMException` with the
  // `"EncodingError"` value when an coding error is found.
  const decoder = new TextDecoder(jsonCharacterEncoding, {fatal: true})
  return decoder.decode(buf);
}

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
      const error = new Error(`Unuseful data uri mime type: ${mimeType}`)
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



async function resolveSources(map, mapUrl, read, options) {
  const result = {
    sourcesResolved: [],
    sourcesContent:  []
  }

  if (!map.sources || map.sources.length === 0) {
    return result
  }

  for (const {fullUrl, sourceContent, index} of resolveSourcesHelper(map, mapUrl, options)) {
    result.sourcesResolved[index] = fullUrl
    if (typeof sourceContent === "string") {
      result.sourcesContent[index] = sourceContent
    } else {
      const readUrl = customDecodeUriComponent(fullUrl)
      try {
        const source = await read(readUrl)
        result.sourcesContent[index] = String(source)
      } catch (error) {
        result.sourcesContent[index] = error
      }
    }
  }

  return result
}

const endingSlash = /\/?$/

function* resolveSourcesHelper(map, mapUrl, options) {
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
    yield {fullUrl, sourceContent, index}
  }
}



async function resolve(code, codeUrl, read, options) {
  if (code === null) {
    const mapUrl = codeUrl
    const data = {
      sourceMappingURL: null,
      url: mapUrl,
      sourcesRelativeTo: mapUrl,
      map: null
    }
    const readUrl = customDecodeUriComponent(mapUrl)
    try {
      const result = await read(readUrl)
      data.map = String(result)
      data.map = parseMapToJSON(data.map, data)
      return await _resolveSources(data)
    } catch (error) {
      error.sourceMapData = data
      throw error
    }
  } else {
    const mapData = await resolveSourceMap(code, codeUrl, read)
    if (!mapData) {
      return null
    }
    return await _resolveSources(mapData)
  }

  async function _resolveSources(mapData) {
    const result = await resolveSources(mapData.map, mapData.sourcesRelativeTo, read, options)
    mapData.sourcesResolved = result.sourcesResolved
    mapData.sourcesContent  = result.sourcesContent
    return mapData
  }
}

module.exports = {
  resolveSourceMap,
  resolveSources,
  resolve,
  parseMapToJSON,
}
