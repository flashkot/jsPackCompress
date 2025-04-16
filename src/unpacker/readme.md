Minified versions of this files are used for manually crafting templates for
file unpacker.

Use this commands to minify extractors code:

```shell
npx google-closure-compiler -O ADVANCED --env BROWSER --js=small.js --js_output_file=small.min.js
npx google-closure-compiler -O ADVANCED --env BROWSER --js=small_lut.js --js_output_file=small_lut.min.js
npx google-closure-compiler -O ADVANCED --env BROWSER --js=universal.js --js_output_file=universal.min.js
```
