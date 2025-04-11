import { fileSorter } from "./sorter.js";
import { binEscape } from "./escaper.js";
import { instantiate } from "../zopfli/index.js";
import {
  CALLER_FULL,
  CALLER_SIMPLE,
  DATA_LOCATION_DEFAULT,
  DATA_LOCATION_SVG,
  DECODER_BIG,
  DECODER_SMALL,
  GETTER,
  HTML_DEFAULT,
  HTML_SVG,
} from "./templates.js";

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

let zopfliWasm = instantiate();

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
  config = {
    script: "\n Empty main script.",
    compressor: "deflate",
    compressionlevel: 9,
    argName: "$fs",
    accessType: "full",
    useSmallDecoder: false,
    compactHtml: false,
    extraHead: "",
    extraBody: "",
    files: null,

    ...config,
  };

  let scriptPrefix = "";
  let scriptCaller = CALLER_SIMPLE;

  if (config.files) {
    scriptPrefix = GETTER[config.accessType] ?? GETTER["all"];

    scriptPrefix = scriptPrefix.replaceAll(
      "$PLACEHOLDER_OBJECT_NAME",
      config.argName
    );
    scriptCaller = CALLER_FULL.replaceAll(
      "$PLACEHOLDER_OBJECT_NAME",
      config.argName
    );
  }

  let htmlTemplate = HTML_DEFAULT;
  let dataLocator = DATA_LOCATION_DEFAULT;

  if (config.compactHtml) {
    htmlTemplate = HTML_SVG;
    dataLocator = DATA_LOCATION_SVG;
  }

  htmlTemplate = htmlTemplate.replaceAll(
    "$PLACEHOLDER_HEAD",
    config.extraHead ?? ""
  );
  htmlTemplate = htmlTemplate.replaceAll(
    "$PLACEHOLDER_BODY",
    config.extraBody ? "</head><body>" + config.extraBody : ""
  );

  let mainScript = config.script;
  let packChunks = [];
  let totalOffset = 0;

  if (config.files) {
    let fileNames = [];
    let filesDict = {};

    for (let f in config.files) {
      fileNames.push(f);
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

    mainScript =
      scriptPrefix.replaceAll(
        "$PLACEHOLDER_PACKED_DATA_FILELIST",
        JSON.stringify(filesDict)
      ) + mainScript.replaceAll("$PLACEHOLDER_OBJECT_NAME", config.argName);
  }

  let te = new TextEncoder();
  packChunks.push(te.encode(mainScript));
  let stats = {};

  let pack = concatArrays(packChunks);
  stats.origSize = pack.length;

  let compressedPack;
  if (typeof config.compressor == "function") {
    compressedPack = await config.compressor(pack);
  } else {
    let zComp = await zopfliWasm;
    compressedPack = zComp(pack, config.compressionlevel);
  }

  stats.cmpSize = compressedPack.length;

  let escapedData = binEscape(compressedPack);

  stats.escSize = escapedData.payload.length;

  let decoder = stats.escSize > 100 * 1024 ? DECODER_BIG : DECODER_SMALL;
  if (config.useSmallDecoder) {
    decoder = DECODER_SMALL;
  }

  scriptCaller = scriptCaller.replaceAll(
    "$PLACEHOLDER_DECODER_LOCATION",
    decoder
  );

  let mapStr = JSON.stringify(escapedData.decodeMap).replaceAll('"', "");

  htmlTemplate = htmlTemplate.replaceAll("$PLACEHOLDER_DECODER", scriptCaller);

  htmlTemplate = htmlTemplate.replaceAll(
    "$PLACEHOLDER_TEXTDATA_LOCATION",
    dataLocator
  );

  htmlTemplate = htmlTemplate.replaceAll(
    "$PLACEHOLDER_WRAPPER_OFFSET",
    totalOffset
  );

  htmlTemplate = htmlTemplate.replaceAll("$PLACEHOLDER_MAPPING", mapStr);

  return {
    payload: concatArrays([te.encode(htmlTemplate), escapedData.payload]),
    stats,
  };
}
