export const GETTER = {
  all: `$PLACEHOLDER_OBJECT_NAME=(_=>{let l=$PLACEHOLDER_PACKED_DATA_FILELIST,f,b=$PLACEHOLDER_OBJECT_NAME,g=(n,t)=>{f=l[n];if(t=="ab")return b.slice(f.o,f.o+f.s);f=new Uint8Array(b,f.o,f.s);if(t=="u8")return f;if(t=="str")return new TextDecoder().decode(f);f=new Blob([f]);return t=="blob"?f:URL.createObjectURL(f);};return{ab:n=>g(n,"ab"),u8:n=>g(n,"u8"),str:n=>g(n,"str"),blob:n=>g(n,"blob"),url:n=>g(n),list:l,b}})();`,
  ArrayBuffer: `$PLACEHOLDER_OBJECT_NAME=n=>{let l=$PLACEHOLDER_PACKED_DATA_FILELIST,b=$PLACEHOLDER_OBJECT_NAME;return n=>b.slice(l[n].o,l[n].o+l[n].s)};`,
  Uint8Array: `$PLACEHOLDER_OBJECT_NAME=n=>{let l=$PLACEHOLDER_PACKED_DATA_FILELIST,b=$PLACEHOLDER_OBJECT_NAME;return n=>new Uint8Array(b,l[n].o,l[n].s)};`,
  String: `$PLACEHOLDER_OBJECT_NAME=n=>{let l=$PLACEHOLDER_PACKED_DATA_FILELIST,b=$PLACEHOLDER_OBJECT_NAME;return n=>new TextDecoder().decode(new Uint8Array(b,l[n].o,l[n].s))};`,
  Blob: `$PLACEHOLDER_OBJECT_NAME=n=>{let l=$PLACEHOLDER_PACKED_DATA_FILELIST,b=$PLACEHOLDER_OBJECT_NAME;return n=>new Blob([new Uint8Array(b,l[n].o,l[n].s)])};`,
  BlobURL: `$PLACEHOLDER_OBJECT_NAME=n=>{let l=$PLACEHOLDER_PACKED_DATA_FILELIST,b=$PLACEHOLDER_OBJECT_NAME;return n=>URL.createObjectURL(new Blob([new Uint8Array(b,l[n].o,l[n].s)]))};`,
};

export const DECODER_SMALL =
  "let c=0,e=0,d=[],a;for(;c<b.length;)a=b.charCodeAt(c++),92==a&&(a=b.charCodeAt(c++),a=114==a?13:a),d[e++]=$PLACEHOLDER_MAPPING[a]??a;return new Uint8Array(d)";
export const DECODER_BIG =
  "let a=7E4,f=0,d=[],c,e=[];for(;0<a;)e[--a]=$PLACEHOLDER_MAPPING[a]??a;for(;a<b.length;)c=b.charCodeAt(a++),92==c&&(c=b.charCodeAt(a++),c=114==c?13:c),d[f++]=e[c];return new Uint8Array(d)";

export const WRAPPER_DEFAULT =
  "(new Response((new Blob([(b=>{$PLACEHOLDER_DECODER_LOCATION})($PLACEHOLDER_TEXTDATA_LOCATION)])).stream().pipeThrough(new DecompressionStream('deflate-raw'))))$PLACEHOLDER_EXECUTOR_LOCATION";
export const WRAPPER_UNIVERSAL =
  "let g=(b,u)=>{$PLACEHOLDER_DECODER_LOCATION},h=c=>{(new Response((new Blob([c])).stream().pipeThrough(new DecompressionStream('deflate-raw'))))$PLACEHOLDER_EXECUTOR_LOCATION};'file:'==window.location.protocol?h(g($PLACEHOLDER_TEXTDATA_LOCATION,$PLACEHOLDER_MAPPING)):fetch`#`.then(c=>c.arrayBuffer()).then(c=>{let a=new Uint8Array(c,$PLACEHOLDER_SKIP_HEADER);a.charCodeAt=b=>a[b];h(g(a,$PLACEHOLDER_SWAP_MAPPING))})";

export const EXECUTOR_FULL =
  ".arrayBuffer().then(b=>Function('$PLACEHOLDER_OBJECT_NAME',new TextDecoder().decode(b.slice($PLACEHOLDER_WRAPPER_OFFSET)))(b))";
export const EXECUTOR_SIMPLE = ".text().then(eval)";

export const HTML_DEFAULT =
  '<!doctype html><html><head><meta charset="iso-8859-15"/>$PLACEHOLDER_HEAD</head><body onload="$PLACEHOLDER_DECODER">$PLACEHOLDER_BODY<!--';
export const HTML_SVG =
  '<meta charset="iso-8859-15"/>$PLACEHOLDER_HEAD$PLACEHOLDER_BODY<svg onload="$PLACEHOLDER_DECODER"><!--';

export const DATA_LOCATION_DEFAULT = "document.body.lastChild.textContent";
export const DATA_LOCATION_SVG = "this.lastChild.textContent";

export function fileListToString(list) {
  let result = [];
  let noEsc = /^(0|[1-9][0-9]*|[$_a-z][$_a-z0-9]*)$/i;

  for (let file in list) {
    let name = noEsc.test(file) ? file : JSON.stringify(file);
    let data = JSON.stringify(list[file]).replaceAll('"', "");
    result.push(name + ":" + data);
  }

  return "{" + result.join(",") + "}";
}

export function prepareWrapper(config) {
  let header = "";

  if (config.payloadSize <= 102_400 || config.useSmallDecoder) {
    header = DECODER_SMALL;
  } else {
    header = DECODER_BIG;
  }

  if (config.universalDecoder) {
    header = header.replaceAll("$PLACEHOLDER_MAPPING", "u");
    header = WRAPPER_UNIVERSAL.replaceAll(
      "$PLACEHOLDER_DECODER_LOCATION",
      header
    );
  } else {
    header = WRAPPER_DEFAULT.replaceAll(
      "$PLACEHOLDER_DECODER_LOCATION",
      header
    );
  }

  if (config.hasFiles) {
    header = header.replaceAll("$PLACEHOLDER_EXECUTOR_LOCATION", EXECUTOR_FULL);
  } else {
    header = header.replaceAll(
      "$PLACEHOLDER_EXECUTOR_LOCATION",
      EXECUTOR_SIMPLE
    );
  }

  let mapStr = JSON.stringify(config.decodeMap).replaceAll('"', "");
  let swapStr = JSON.stringify(config.swapMap).replaceAll('"', "");
  header = header
    .replaceAll("$PLACEHOLDER_MAPPING", mapStr)
    .replaceAll("$PLACEHOLDER_SWAP_MAPPING", swapStr)
    .replaceAll("$PLACEHOLDER_OBJECT_NAME", config.argName)
    .replaceAll("$PLACEHOLDER_WRAPPER_OFFSET", config.scriptOffset);

  if (config.compactHtml) {
    header = header.replaceAll(
      "$PLACEHOLDER_DECODER_LOCATION",
      DATA_LOCATION_SVG
    );

    header = HTML_SVG.replaceAll("$PLACEHOLDER_DECODER", header);

    header = header.replaceAll(
      "$PLACEHOLDER_TEXTDATA_LOCATION",
      DATA_LOCATION_SVG
    );
  } else {
    header = header.replaceAll(
      "$PLACEHOLDER_DECODER_LOCATION",
      DATA_LOCATION_DEFAULT
    );

    header = HTML_DEFAULT.replaceAll("$PLACEHOLDER_DECODER", header);
    header = header.replaceAll(
      "$PLACEHOLDER_TEXTDATA_LOCATION",
      DATA_LOCATION_DEFAULT
    );
  }

  header = header.replaceAll("$PLACEHOLDER_BODY", config.extraBody ?? "");
  header = header.replaceAll("$PLACEHOLDER_HEAD", config.extraHead ?? "");

  // UGLY
  // This part hurts my brain. A simple task: need to insert into html template
  // length of said template. But there is a case when adding number into
  // template will make it one char longer (like 997 + 3 = 1000). So i do it
  // twice to make sure final number is correct.
  // IDK how to make this in a nice and clean way. But it feels like there is a
  // better solution to this.

  let tplLen = header.length - "$PLACEHOLDER_SKIP_HEADER".length;
  let finalTplLen = tplLen + String(tplLen).length;
  finalTplLen = tplLen + String(finalTplLen).length;

  header = header.replaceAll("$PLACEHOLDER_SKIP_HEADER", finalTplLen);

  return header;
}

export function preparePrefix(config) {
  let scriptPrefix = "";

  if (config.hasFiles) {
    scriptPrefix = GETTER[config.accessType] ?? GETTER["all"];
  }

  scriptPrefix = scriptPrefix
    .replaceAll(
      "$PLACEHOLDER_PACKED_DATA_FILELIST",
      fileListToString(config.filesDict)
    )
    .replaceAll("$PLACEHOLDER_OBJECT_NAME", config.argName);

  return scriptPrefix;
}
