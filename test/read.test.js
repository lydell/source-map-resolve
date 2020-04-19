"use strict";

const { u1 } = require("./common");
const { resolveSourceMap, resolveSources, resolve } = require("..");

const mapUrl = "operators%20map.json";
const codeUrl = "./built files/operators:+-<>%25.js";
const sourceUrl = "../source files/operators:+-<>%25.coffee";

describe("read: resolveSourceMap", () => {
  function read(file) {
    expect(file).toBe("built files/operators map.json");
    return "{}";
  }

  it("works with asynchronous read", async () => {
    const result = await resolveSourceMap(u1(mapUrl), codeUrl, async (file) =>
      read(file)
    );
    expect(result).toBeDefined();
  });

  it("works with synchronous read", async () => {
    const result = await resolveSourceMap(u1(mapUrl), codeUrl, read);
    expect(result).toBeDefined();
  });
});

describe("read: resolveSources", () => {
  function read(file) {
    expect(file).toBe("../source files/operators:+-<>%.coffee");
    return "source code";
  }

  const map = {
    sources: [sourceUrl],
  };

  it("works with asynchronous read", async () => {
    const result = await resolveSources(map, mapUrl, async (file) =>
      read(file)
    );
    expect(result).toBeDefined();
  });

  it("works with synchronous read", async () => {
    const result = await resolveSources(map, mapUrl, read);
    expect(result).toBeDefined();
  });
});

describe("read: resolve", () => {
  function read(file) {
    switch (file) {
      case "built files/operators map.json":
        return JSON.stringify({
          sources: [sourceUrl],
        });
      case "source files/operators:+-<>%.coffee":
        return "source code";
      default:
        throw new Error(`Unexpected filename ${file}.`);
    }
  }

  it("works with asynchronous read", async () => {
    const result = await resolve(u1(mapUrl), codeUrl, async (file) =>
      read(file)
    );
    expect(result).toBeDefined();
  });

  it("works with synchronous read", async () => {
    const result = await resolve(u1(mapUrl), codeUrl, read);
    expect(result).toBeDefined();
  });
});
