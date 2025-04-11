export const CALLER_FULL =
  "(new Response((new Blob([$PLACEHOLDER_DECODER_LOCATION])).stream().pipeThrough(new DecompressionStream('deflate-raw')))).arrayBuffer().then(b=>Function('$PLACEHOLDER_OBJECT_NAME',new TextDecoder().decode(b.slice($PLACEHOLDER_WRAPPER_OFFSET)))(b))";
export const CALLER_SIMPLE =
  "(new Response((new Blob([$PLACEHOLDER_DECODER_LOCATION])).stream().pipeThrough(new DecompressionStream('deflate-raw')))).text().then(eval)";

export const DECODER_SMALL =
  "(b=>{let c=0,e=0,d=[],a;for(;c<b.length;)a=b.charCodeAt(c++),92==a&&(a=b.charCodeAt(c++),a=114==a?13:a),d[e++]=$PLACEHOLDER_MAPPING[a]??a;return new Uint8Array(d)})($PLACEHOLDER_TEXTDATA_LOCATION)";
export const DECODER_BIG =
  "(c=>{let a,f=0,d=[],b,e=[];for(a=7E4;0<a;--a)e[a]=$PLACEHOLDER_MAPPING[a]??a;for(;a<c.length;)b=c.charCodeAt(a++),92==b&&(b=c.charCodeAt(a++),b=114==b?13:b),d[f++]=e[b];return new Uint8Array(d)})($PLACEHOLDER_TEXTDATA_LOCATION)";

export const HTML_DEFAULT =
  '<!doctype html><html><head><meta charset="iso-8859-15"/>$PLACEHOLDER_HEAD</head><body onload="$PLACEHOLDER_DECODER">$PLACEHOLDER_BODY<!--';
export const HTML_SVG =
  '<meta charset="iso-8859-15"/>$PLACEHOLDER_HEAD<svg onload="$PLACEHOLDER_DECODER">$PLACEHOLDER_BODY<!--';

export const DATA_LOCATION_DEFAULT = "document.body.lastChild.textContent";
export const DATA_LOCATION_SVG = "this.lastChild.textContent";

export const GETTER = {
  all: `$PLACEHOLDER_OBJECT_NAME=(_=>{let l=$PLACEHOLDER_PACKED_DATA_FILELIST,f,b=$PLACEHOLDER_OBJECT_NAME,g=(n,t)=>{f=l[n];if(t=="ab")return b.slice(f.o,f.o+f.s);f=new Uint8Array(b,f.o,f.s);if(t=="u8")return f;if(t=="str")return new TextDecoder().decode(f);f=new Blob([f]);return t=="blob"?f:URL.createObjectURL(f);};return{ab:n=>g(n,"ab"),u8:n=>g(n,"u8"),str:n=>g(n,"str"),blob:n=>g(n,"blob"),url:n=>g(n),list:l,b}})();`,
  ArrayBuffer: `$PLACEHOLDER_OBJECT_NAME=n=>{let l=$PLACEHOLDER_PACKED_DATA_FILELIST,b=$PLACEHOLDER_OBJECT_NAME;return n=>b.slice(l[n].o,l[n].o+l[n].s)};`,
  Uint8Array: `$PLACEHOLDER_OBJECT_NAME=n=>{let l=$PLACEHOLDER_PACKED_DATA_FILELIST,b=$PLACEHOLDER_OBJECT_NAME;return n=>new Uint8Array(b,l[n].o,l[n].s)};`,
  String: `$PLACEHOLDER_OBJECT_NAME=n=>{let l=$PLACEHOLDER_PACKED_DATA_FILELIST,b=$PLACEHOLDER_OBJECT_NAME;return n=>new TextDecoder().decode(new Uint8Array(b,l[n].o,l[n].s))};`,
  Blob: `$PLACEHOLDER_OBJECT_NAME=n=>{let l=$PLACEHOLDER_PACKED_DATA_FILELIST,b=$PLACEHOLDER_OBJECT_NAME;return n=>new Blob([new Uint8Array(b,l[n].o,l[n].s)])};`,
  BlobURL: `$PLACEHOLDER_OBJECT_NAME=n=>{let l=$PLACEHOLDER_PACKED_DATA_FILELIST,b=$PLACEHOLDER_OBJECT_NAME;return n=>URL.createObjectURL(new Blob([new Uint8Array(b,l[n].o,l[n].s)]))};`,
};
