import { readFileSync, writeFileSync } from "fs";

let [_node, _self, wasmFile, jsFile] = process.argv;

if (wasmFile) {
  let bin = readFileSync(wasmFile).toString("base64");
  let output = `export const wasm ="${bin}";\n`;

  if (jsFile) {
    writeFileSync(jsFile, output);
  } else {
    console.log(output);
  }
}
