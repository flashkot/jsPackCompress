/*
  Since we put main JS file to the end of the package, this sorter tries to
  organize files so same types are together (this should help deflate
  compression) and also put any extra js file to the end
*/
const EXT_RANKS = {
  js: 1,

  html: 2,
  htm: 2,
  css: 2,
  xml: 2,
  svg: 2,
  txt: 2,
  csv: 2,
  json: 2,
};

let collator = new Intl.Collator("en", {
  usage: "sort",
  sensetivity: "accent",
  numeric: true,
});

export function fileSorter(b, a) {
  let extA = a.toLowerCase().match(/\.([^.]+)$/)?.[1] ?? ".";
  let extB = b.toLowerCase().match(/\.([^.]+)$/)?.[1] ?? ".";

  if (extA == extB) return collator.compare(a, b);

  let rA = EXT_RANKS[extA] ?? 10000;
  let rB = EXT_RANKS[extB] ?? 10000;

  if (rA != rB) return rA - rB;

  return collator.compare(extA, extB);
}
