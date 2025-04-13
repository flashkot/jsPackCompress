# jsPackCompress

Utility for packing JavaScript files into self-extracting compressed HTML.
Also can add extra files (images, css, anything else) into package.

While there are already tools like this (for example:
[fetchcrunch](https://github.com/subzey/fetchcrunch)
or [jsExe](https://www.pouet.net/prod.php?which=59298)) they do not suit my
needs because they share same flaw - compressed HTML file must be served from
HTTP server or they will not work.

You can read more about my motivation and how this tool works in
[Why and how](#why-and-how) section.

## ⚠️ NOT FOR REGULAR WEB!

While it may be tempting to use this packing for regular web sites (or PWAs), it
is a bad idea to do so.

You can achieve much better result with properly configured compression on your
HTTP server and by using service workers.

And even without that, delay introduced by unpacking is quite noticeable.
Especially on low-end devices (like smartphones). Better let users download more
and then see content instantly without delay and page freeze.

So this tool is a curiosity better suited for niche projects or stuff like
demoscene or game jams like [js13kgames](https://js13kgames.com/).

### Install

From NPM for use as a [command line app](#command-line-usage):

```shell
npm install jspackcompress -g
```

From NPM for [programmatic use](#using-from-code):

```shell
npm install jspackcompress
```

## Command line usage

```
Usage: jspackcompress [options] [extra files...]

Package JavaScript file into self-extracting compressed HTML file

Options:
  -i, --input <file>         JavaScript file to use as the entry point
  -o, --output <file>        output filename for the compressed HTML. If not
                             specified, the input file name with the extension
                             changed from `.js` to `.html` will be used
  -l, --level <number>       compression level (2–9). A lower value is faster
                             but less compressed; a higher value is slower but
                             more compressed (default: 9)
  -a, --arg-name <name>      name of the wrapper function argument to access
                             extra files (default: "$fs")
  -g, --getter <type>        how content of extra files should be returned.
                             Options include: `ArrayBuffer`, `Uint8Array`,
                             `String`, `Blob`, or `BlobURL`. Use `all` to have
                             all types as properties of the wrapper argument
                             (default: "all")
  -s, --small-decoder        Always use small decoder
  -c, --compact-html         Generate compact HTM.
  -e, --extra-head <string>  additional string to include in the <HEAD> section
  -b, --extra-body <string>  additional string to include in the <BODY> section
  -V, --version              output the version number
  -h, --help                 display help for command

You can use glob patterns to specify extra files:
  $ jspackcompress -i index.js -o game.html assets/*
```

Options worth explaining:

### `--arg-name`

If package consists of single `.js` file, after decompression its contents
executed via `eval` command.

But if package contains extra files, their content must be passed to main script
somehow. This is achieved by executing main script via [Function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/Function).
It looks something like this:

```js
new Function("$fs", scriptContent)(filesData);
```

`"$fs"` is the default name for function argument. If it clashes with some
variable in your code, or if you want to save some extra bytes, you can change
name of this variable with `--arg-name`. Next section describes how to use this
argument to get files content.

> **NOTE**: no checks are made that value provided with `--arg-name` is valid
> variable name in JavaScript.

### `--getter`

Before packing all files are concatenated and compressed as single binary blob.
Uncompressed `ArrayBuffer` then passed to main script as `$fs` argument.

To make access easier a small bit of code prepended to main script that
transforms this `$fs` to an object with following methods and props:

```js
// get file content as ArrayBuffer (slice)
$fs.ab("image.webp");

// get file content as Uint8Array
$fs.u8("image.webp");

// get file content as a String
$fs.str("data.json");

// get file content as a Blob
$fs.blob("data.csv");

// get file content as a Blob URL
$fs.url("data.csv");

// original ArrayBuffer with all files
$fs.b;

// object with information about each file
// NOTE: main script is not included into this object
$fs.list;
// and it looks liek this:
{
  "1.webp": {
    o: 0,    // offest
    s: 12345 // size of the file
  },
  "2.webp": {
    o: 12345,
    s: 54321
  },
  ...
}
```

This is default. But if you don't need all of this and want to save some bytes,
then you can use `--getter` to limit returned value to one type. Possible values
are `ArrayBuffer`, `Uint8Array`, `String`, `Blob`, and `BlobURL`. In this case
you use `$fs` directly as a function

```js
// if packed with `--getter BlobURL` then Blolb URL for the file is returned
let url = $fs("1.webp");
```

### `--small-decoder`

There are two decoders for the packed file. jsPackCompress chooses one depending
on the size of the payload. If it is less than 100KiB then
[smaller decoder](src/unpacker/small.js) is used. If it is more than 100KiB then
it uses [bigger decoder](src/unpacker/small_lut.js).

The bigger one uses Look Up Table (it needs to be filled first) for faster
decoding. Which is especially noticeable when packing several megabytes. But it
becomes slower on small payloads (especially when look up table is bigger than
payload itself)

If you still need to save extra bytes (like 31 in this case) you can force
smaller decoder with this option.

### `--compact-html`

HTML of packed file looks like this
(newlines and indentation added for readability):

```html
<!doctype html>
  <html>
    <head>
      <meta charset="iso-8859-15"/>
    </head>
  <body onload="decoderCode">
<!--BINARY_DATA
```

If you don't need `doctype` and do not mind that there will be an empty `svg`
image in the HTML, you can use `--compact-html` which will reduce it to this:

```html
<meta charset="iso-8859-15"/>
<svg onload="decoderCode">
<!--BINARY_DATA
```

This can save you 35 bytes.

## Using from code

If installed as package dependency, you can use jsPackCompress like this:

```js
import { pack } from "jspackcompress";

let result = await pack({
  script: "console.log('Hello, World!');",
  compressor: customCompressFunction,
  compressionlevel: 9,
  argName: "$fs",
  accessType: "all",
  compactHtml: false,
  useSmallDecoder: false,
  extraHead: "<title>Cool Page!</title>",
  extraBody: "<canvas>",
  files: {
    "1.webp": {
      content: fileData, // Uint8Array / node.js Buffer
      label: "1",
    },
  },
});
```

> **Note**: `pack` function is asynchronous so use `await` or `.then()`.

There are two extras in config object when compared to cli:

**`compressor`**: you can provide custom compression function. It will be called
with `Uint8Array` as its only argument and is expected to return "raw deflate"
compressed data as `Uint8Array`.

**`label`** in list of files. This label will be used instead of the file name
to access file data from code. So in this example to get Blob URL for 1.webp you
need to use `$fs.url(1)` method.

Returned value of the `pack` function will be an object structured like this:

```js
{
  payload: Uint8Array, // packed HTML file content
  stats: {
    origSize: 90393, // size of uncompressed data
    cmpSize: 47463,  // size of compressed data
    escSize: 47761   // size of compressed data after escaping special symbols
  }
}
```

## How to build

**NOTE**: this repo uses git submodules. Use `--recursive` option while cloning.

JavaScript part of the package can be build by executing `npm run build` command.

### Building WASM module

Requirements:

- [Emscripten](https://emscripten.org/)
- [CMake](https://cmake.org/)
- [Ninja](https://ninja-build.org/)

In console with `emsdk_env` applied go to `zopfli` folder and execute:

```shell
emcmake cmake .
cmake --bild .
```

This will also execute `npm run build` command in the end.

## Why and how

My initial goal was to pack a small game made with Godot into a single HTML file.
Not a problem since you can embed anything into HTML using base64. However,
in this case this "small" game had a 42MiB WASM file with complete engine.

By recompiling web export template and removing unused engine features, I
managed to reduce WASM size to 27MiB. Or 6.6MiB when gzipped.

This is when i discovered [Efficient Compression Tool](https://github.com/fhanau/Efficient-Compression-Tool).
Its modified zopfli algorithm works much faster and achieves a better
compression ratio to the original zopfli (at least with less than 100
iterations. And using 1000 iterations doesn't seem to produce better results).

Anyway, encoding this with base64 adds 2 extra megabytes to HTML. Clearly,
another encoding was needed for the compressed data.

I knew that [jsExe](https://www.pouet.net/prod.php?which=59298) exists. And
that would be an ideal solution. But unfortunately modern browsers security
restricts access to image pixels when page is opened with `file://` protocol.
I've searched what demoscene people use these days and found
[fetchcrunch](https://github.com/subzey/fetchcrunch) - modern solution but with
the same flaw. This time it is not allowed to use `fetch` from local files.

It seems that for my case, compressed data must be part of the decoder code.

### iso-8859-15

I've tried storing binary data in js strings as-is (with escaping of course)
and reading it back with `charCodeAt`. This was not working well with UTF-8
due to its multi-byte encoding. So I've tried single-byte encodings. And
discovered that if you set HTML codepage to "iso-8859-15" there will be only 10
problematic bytes.

First is the byte `0x0D` (`\r` character), which is converted to `\n`
during HTML parsing. This meant I had to escape both `\r` and `\\`.

Then there is 9 bytes for which `charCodeAt` returns incorrect values:

```js
{
  0: 65533,
  164: 8364,
  166: 352,
  168: 353,
  180: 381,
  184: 382,
  188: 338,
  189: 339,
  190: 376,
}
```

Then I moved the compressed data to HTML comments at the end of the file,
avoiding the need to escape quotes and newlines. However, I still had to
escape `-->`. In addition browser doesn't try to render all this bytes as page
text (which was another source of stutter to page loading).

I wrote function to escape data. This function also checks if there are any less
common bytes than `\\` and `\r`. And if there is it swaps them to save some
bytes on escaping and adds them to the mapping.

Finally the decoding process looks like this:

- get data as String from comment with `document.body.lastChild.textContent`
- convert it to bytes with `charCodeAt`
- remove escaping and fix `\r` char
- pipe result through `DecompressionStream('deflate-raw')`
- convert result to text with `TextDecoder()` and execute

In the end this escaping adds around 0.7% to original file size. Which is more
than acceptable for me when compared to 33% size increase from base64.

## License

MIT license.

Includes code from [Efficient Compression Tool](https://github.com/fhanau/Efficient-Compression-Tool)
which is under Apache-2.0 license.
