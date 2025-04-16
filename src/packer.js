import { fileSorter } from "./sorter.js";
import { binEscape } from "./escaper.js";
import { instantiate } from "../zopfli/index.js";
import { preparePrefix, prepareWrapper } from "./templates.js";

function concatArrays(arrays) {
  let size = 0;

  arrays.forEach((a) => (size += a.length));

  let res = new Uint8Array(size);

  let offset = 0;

  arrays.forEach((a) => {
    res.set(a, offset);
    offset += a.length;
  });

  return res;
}

/**
 * Generates compressed HTML file from provided configuration
 *
 * Same as `pack` except it requires that you provide your own compression
 * function. This function will be called with single argument - Uint8Array with
 * data to compress and expected to retrun Uint8Arrya with compressed data.
 *
 * This function exists to help with tree-shaking.
 *
 * ```js
 * config = {
 *   script: String, // this script will be executed after unpacking
 *   compressor: async function, // raw-deflate compression fucntion
 *   compressionlevel: 9, // `level` option for built-in compressor
 *   argName: "$fs", // sets name to wrapper function argument where files data will be stored
 *   accessType: "all", // or ArrayBuffer, Uint8Array, String, Blob, BlobURL
 *   useSmallDecoder: false,
 *   compactHtml: false,
 *   universalDecoder: false,
 *   extraHead: "",
 *   extraBody: "",
 *   files: {
 *     "image.png": {content: Uint8Array, label: "i"},
 *   },
 * }
 * ```
 *
 * @param {Object} config - configuration object
 * @returns {Uint8Array}
 */

export async function packOnly(config) {
  config = {
    script: "\n Empty main script.",
    compressor: "deflate",
    compressionlevel: 9,
    argName: "$fs",
    accessType: "full",
    useSmallDecoder: false,
    compactHtml: false,
    universalDecoder: false,
    extraHead: "",
    extraBody: "",
    files: null,

    ...config,
  };

  config.hasFiles = false;
  config.scriptOffset = 0;

  let packChunks = [];
  let totalOffset = 0;

  let fileNames = [];
  let filesDict = {};

  for (let f in config.files) {
    fileNames.push(f);
    config.hasFiles = true;
  }

  fileNames.sort(fileSorter);

  fileNames.forEach((name) => {
    let file = config.files[name];

    packChunks.push(file.content);
    filesDict[file.label ?? name] = {
      s: file.content.length,
      o: totalOffset,
    };
    totalOffset += file.content.length;
  });

  config.scriptOffset = totalOffset;
  config.filesDict = filesDict;

  let mainScript = preparePrefix(config) + config.script;
  mainScript = mainScript.replaceAll(
    "$PLACEHOLDER_OBJECT_NAME",
    config.argName
  );

  let te = new TextEncoder();
  packChunks.push(te.encode(mainScript));
  let stats = {};

  let pack = concatArrays(packChunks);
  stats.origSize = pack.length;

  let compressedPack = await config.compressor(pack);

  stats.cmpSize = compressedPack.length;

  let escapedData = binEscape(compressedPack);
  config.decodeMap = escapedData.decodeMap;
  config.swapMap = escapedData.swapMap;

  stats.escSize = escapedData.payload.length;

  let htmlTemplate = prepareWrapper(config);

  return {
    payload: concatArrays([te.encode(htmlTemplate), escapedData.payload]),
    stats,
  };
}

/**
 * Generates compressed HTML file from provided configuration
 *
 * ```js
 * config = {
 *   script: String, // this script will be executed after unpacking
 *   compressor: async function, // in case you want to use your own raw-deflate
 *   compressionlevel: 9, // `level` option for built-in compressor
 *   argName: "$fs", // sets name to wrapper function argument where files data will be stored
 *   accessType: "all", // or ArrayBuffer, Uint8Array, String, Blob, BlobURL
 *   useSmallDecoder: false,
 *   compactHtml: false,
 *   universalDecoder: false,
 *   extraHead: "",
 *   extraBody: "",
 *   files: {
 *     "image.png": {content: Uint8Array, label: "i"},
 *   },
 * }
 * ```
 *
 * @param {Object} config - configuration object
 * @returns {Uint8Array}
 */

export async function pack(config) {
  if (typeof config.compressor != "function") {
    config.compressor = (data) =>
      instantiate().then((z) => z(data, config.compressionlevel));
  }

  return packOnly(config);
}

export { binEscape, ISO_TO_UTF, UTF_TO_ISO } from "./escaper.js";
export { preparePrefix, prepareWrapper } from "./templates.js";
export { fileSorter } from "./sorter.js";
export { instantiate } from "../zopfli/index.js";
