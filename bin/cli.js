#!/usr/bin/env node

import { createRequire } from "node:module";
import { Command } from "commander";
import { globSync } from "glob";
import { basename, resolve } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import { pack } from "../index.js";

const require = createRequire(import.meta.url);
const pkg = require("../package.json");

const program = new Command();
console.log(pkg.name, pkg.version);

program
  .name(pkg.name)
  .description(
    "Package JavaScript file into self-extracting compressed HTML file"
  )
  .requiredOption(
    "-i, --input <file>",
    "JavaScript file to use as the entry point"
  )
  .option(
    "-o, --output <file>",
    "output filename for the compressed HTML. If not specified, the input file name with the extension changed from `.js` to `.html` will be used"
  )
  .option(
    "-l, --level <number>",
    "compression level (2–9). A lower value is faster but less compressed; a higher value is slower but more compressed",
    9
  )
  .option(
    "-a, --arg-name <name>",
    "name of the wrapper function argument to access extra files",
    "$fs"
  )
  .option(
    "-g, --getter <type>",
    "how content of extra files should be returned. Options include: `ArrayBuffer`, `Uint8Array`, `String`, `Blob`, or `BlobURL`. Use `all` to have all types as properties of the wrapper argument",
    "all"
  )
  .option("-s, --small-decoder", "Always use small decoder")
  .option("-c, --compact-html", "Generate compact HTM.")
  .option(
    "-e, --extra-head <string>",
    "additional string to include in the <HEAD> section"
  )
  .option(
    "-b, --extra-body <string>",
    "additional string to include in the <BODY> section"
  )
  .argument("[extra files...]")
  .version(pkg.version);
program
  .addHelpText(
    "after",
    `
You can use glob patterns to specify extra files:
  $ ${pkg.name} -i index.js -o game.html assets/*
    `
  )
  .parse();

let filesContent = {};

const opts = program.opts();
let script;

try {
  script = readFileSync(opts.input, "utf8");
} catch (e) {
  console.error(`Can't read file: "${opts.input}"\n  ${e.message}`);
  process.exit(1);
}

console.log("");

for (let file of program.args) {
  let globs = globSync(file, {
    nodir: true,
    posix: true,
    windowsPathsNoEscape: true,
  });

  if (globs.length === 0) {
    console.error(`Can't find file: "${file}".`);
    process.exit(1);
  }

  globs.forEach((g) => {
    let content;

    try {
      content = readFileSync(g);
    } catch (e) {
      console.error(`Can't read file: "${g}"\n  ${e.message}`);
      process.exit(1);
    }

    let fName = basename(resolve(g));

    if (filesContent[fName]) {
      console.warn(
        `  Duplicate file "${fName}".\n    Replacing "${filesContent[fName].location}" with content from "${g}".`
      );
    } else {
      console.log(`  Added "${fName}" from "${g}".`);
    }

    filesContent[fName] = {
      content,
      location: g,
    };
  });
}

let startTime = performance.now();

let result = await pack({
  script,
  compressionlevel: opts.level,
  argName: opts.argName,
  accessType: opts.getter,
  useSmallDecoder: opts.smallDecoder,
  compactHtml: opts.compactHtml,
  extraHead: opts.extraHead,
  extraBody: opts.extraBody,
  files: filesContent,
});

let endTime = performance.now();

let st = result.stats;

let outFile = opts.output;

if (!outFile) {
  outFile = opts.input.replace(/\.js$/i, "") + ".html";
}

try {
  writeFileSync(outFile, result.payload);
} catch (e) {
  console.error(`Can't write to file: "${outFile}"\n  ${e.message}`);
  process.exit(1);
}

console.log(`\nPacked in ${((endTime - startTime) / 1000).toFixed(2)}s\n`);

console.log(`  Payload size: ${st.origSize}`);

console.log(
  `  Compressed size: ${st.cmpSize} (${(
    (100 * st.cmpSize) /
    st.origSize
  ).toFixed(2)}%)`
);

console.log(
  `  Escaped size: ${st.escSize} (${((100 * st.escSize) / st.cmpSize).toFixed(
    2
  )}% / +${st.escSize - st.cmpSize})`
);

console.log(
  `  HTML file size: ${result.payload.length} (${(
    (100 * result.payload.length) /
    st.escSize
  ).toFixed(2)}% / +${result.payload.length - st.escSize})`
);

console.log(
  `  Total overhead: ${result.payload.length - st.cmpSize} (${(
    (100 * (result.payload.length - st.cmpSize)) /
    result.payload.length
  ).toFixed(2)}%)`
);
