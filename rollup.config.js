import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";

export default [
  {
    input: "src/packer.js",
    output: {
      file: "index.js",
      format: "es",
    },
    plugins: [nodeResolve(), commonjs(), terser()],
  },  
];
