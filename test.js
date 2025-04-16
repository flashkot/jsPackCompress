import test from "node:test";
import { readFileSync } from "node:fs";
import { pack } from "./src/packer.js";
import { instantiate } from "./zopfli/index.js";
import { inflateRawSync } from "node:zlib";
import { binEscape, ISO_TO_UTF } from "./src/escaper.js";
import { DECODER_BIG, DECODER_SMALL } from "./src/templates.js";

let testScript = readFileSync("./index.js", "utf8");
let testFile = readFileSync("./package-lock.json");

function compareArrays(a, b) {
  if (b.length != a.length) {
    throw new Error("Different length of arrays.");
  }

  for (let i = 0; i < a.length; i++) {
    if (b[i] != a[i]) {
      throw new Error(`Different byte at ${i}. ${b[i]} != ${a[i]}.`);
    }
  }
}

test("Escape and unescape", () => {
  let testData = [];

  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 256; j++) {
      testData.push(j);
    }

    // this should trigger byte swapping
    testData.push(92); // "\\"
    testData.push(92); // "\\"
    testData.push(92); // "\\"
    testData.push(13); // "\r"
    testData.push(13); // "\r"
    testData.push(92); // "\\"
    testData.push(13); // "\r"
    testData.push(13); // "\r"
    testData.push(13); // "\r"

    // and HTML comment closing tag
    testData.push(45); // "-"
    testData.push(45); // "-"
    testData.push(62); // ">"
  }

  let testEscaped = binEscape(testData);
  let testStr = "";

  testEscaped.payload.forEach((b) => {
    testStr += String.fromCharCode(ISO_TO_UTF[b] ?? b);
  });

  let smallDec = new Function(
    "b",
    "u",
    DECODER_SMALL.replace("$PLACEHOLDER_MAPPING", "u")
  );

  let bigDec = new Function(
    "b",
    "u",
    DECODER_BIG.replace("$PLACEHOLDER_MAPPING", "u")
  );

  let res;

  res = smallDec(testStr, testEscaped.decodeMap);
  compareArrays(testData, res);

  res = bigDec(testStr, testEscaped.decodeMap);
  compareArrays(testData, res);
});

test("Compress and decompress", async () => {
  let ect = await instantiate();
  let compressed = ect(testFile, 2);
  let decompressed = inflateRawSync(compressed);

  compareArrays(testFile, decompressed);
});

// Unfortunately I don't know how to test that generated HTML file really
// works properly. But at least we can test that function does not throw.
test("Package HTML", async () => {
  return pack({
    script: testScript,
    compressionlevel: 2,
    files: { "data.json": { content: testFile } },
  });
});
