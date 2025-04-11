import { fileSorter } from "./sorter";
import { binEscape } from "./escaper";
import { instantiate } from "../zopfli/index.js";

const CALLER_FULL =
  ".arrayBuffer().then(b=>Function('$PLACEHOLDER_OBJECT_NAME',new TextDecoder().decode(b.slice($PLACEHOLDER_WRAPPER_OFFSET)))(b))";
const CALLER_SIMPLE = ".text().then(eval)";

const DECODER_SMALL =
  "(new Response((new Blob([(b=>{let c=0,e=0,d=[],a;for(;c<b.length;)a=b.charCodeAt(c++),92==a&&(a=b.charCodeAt(c++),a=114==a?13:a),d[e++]=$PLACEHOLDER_MAPPING[a]??a;return new Uint8Array(d)})($PLACEHOLDER_TEXTDATA_LOCATION)])).stream().pipeThrough(new DecompressionStream('deflate-raw'))))";
const DECODER_BIG =
  "(new Response((new Blob([(c=>{let a,f=0,d=[],b,e=[];for(a=7E4;0<a;--a)e[a]=$PLACEHOLDER_MAPPING[a]??a;for(;a<c.length;)b=c.charCodeAt(a++),92==b&&(b=c.charCodeAt(a++),b=114==b?13:b),d[f++]=e[b];return new Uint8Array(d)})($PLACEHOLDER_TEXTDATA_LOCATION)])).stream().pipeThrough(new DecompressionStream('deflate-raw'))))";

const HTML_DEFAULT =
  '<!doctype html><html><head><meta charset="iso-8859-15"/>$PLACEHOLDER_HEAD</head><body onload="$PLACEHOLDER_DECODER">$PLACEHOLDER_BODY<!--';
const HTML_SVG =
  '<meta charset="iso-8859-15"/>$PLACEHOLDER_HEAD<svg onload="$PLACEHOLDER_DECODER">$PLACEHOLDER_BODY<!--';

const DATA_LOCATION_DEFAULT = "document.body.lastChild.textContent";
const DATA_LOCATION_SVG = "this.lastChild.textContent";

const GETTER = {
  all: `$PLACEHOLDER_OBJECT_NAME=(_=>{let l=$PLACEHOLDER_PACKED_DATA_FILELIST,f,b=$PLACEHOLDER_OBJECT_NAME,g=(n,t)=>{f=l[n];if(t=="ab")return b.slice(f.o,f.o+f.s);f=new Uint8Array(b,f.o,f.s);if(t=="u8")return f;if(t=="str")return new TextDecoder().decode(f);f=new Blob([f]);return t=="blob"?f:URL.createObjectURL(f);};return{ab:n=>g(n,"ab"),u8:n=>g(n,"u8"),str:n=>g(n,"str"),blob:n=>g(n,"blob"),url:n=>g(n),list:l,b}})();`,
  ArrayBuffer: `$PLACEHOLDER_OBJECT_NAME=n=>{let l=$PLACEHOLDER_PACKED_DATA_FILELIST,b=$PLACEHOLDER_OBJECT_NAME;return n=>b.slice(l[n].o,l[n].o+l[n].s)};`,
  Uint8Array: `$PLACEHOLDER_OBJECT_NAME=n=>{let l=$PLACEHOLDER_PACKED_DATA_FILELIST,b=$PLACEHOLDER_OBJECT_NAME;return n=>new Uint8Array(b,l[n].o,l[n].s)};`,
  String: `$PLACEHOLDER_OBJECT_NAME=n=>{let l=$PLACEHOLDER_PACKED_DATA_FILELIST,b=$PLACEHOLDER_OBJECT_NAME;return n=>new TextDecoder().decode(new Uint8Array(b,l[n].o,l[n].s))};`,
  Blob: `$PLACEHOLDER_OBJECT_NAME=n=>{let l=$PLACEHOLDER_PACKED_DATA_FILELIST,b=$PLACEHOLDER_OBJECT_NAME;return n=>new Blob([new Uint8Array(b,l[n].o,l[n].s)])};`,
  BlobURL: `$PLACEHOLDER_OBJECT_NAME=n=>{let l=$PLACEHOLDER_PACKED_DATA_FILELIST,b=$PLACEHOLDER_OBJECT_NAME;return n=>URL.createObjectURL(new Blob([new Uint8Array(b,l[n].o,l[n].s)]))};`,
};

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

    ...userConfig,
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

  let mapStr = JSON.stringify(escapedData.decodeMap).replaceAll('"', "");

  htmlTemplate = htmlTemplate.replaceAll(
    "$PLACEHOLDER_DECODER",
    decoder + scriptCaller
  );

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
