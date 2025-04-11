// These mappings are for iso-8859-15 charset read into UTF-16 JS strings
export const ISO_TO_UTF = {
  0: 65533,
  164: 8364,
  166: 352,
  168: 353,
  180: 381,
  184: 382,
  188: 338,
  189: 339,
  190: 376,
};

export const UTF_TO_ISO = {
  65533: 0,
  8364: 164,
  352: 166,
  353: 168,
  381: 180,
  382: 184,
  338: 188,
  339: 189,
  376: 190,
};

export function binEscape(data) {
  let subst92 = 92;
  let subst13 = 13;

  // count statistics
  let counts = Array(256).fill(0);
  data.forEach((b) => counts[b]++);

  let origEscSize = counts[subst92] + counts[subst13];

  // lets find out two least used bytes in our data
  let sortedCounts = counts
    .map((a, i) => [a, i])
    .filter((a) => a[1] != 13 && a[1] != 92)
    .sort((a, b) => a[0] - b[0]);

  let substOne, substTwo;
  if (counts[92] > counts[13]) {
    substOne = 92;
    substTwo = 13;
  } else {
    substOne = 13;
    substTwo = 92;
  }

  // Check if it is really worth it to swap values.
  let overheadMap = `XX:${sortedCounts[0][1]},`.length * 2;
  if (overheadMap < counts[substOne] - sortedCounts[0][0]) {
    if (substOne == 13) {
      subst13 = sortedCounts[0][1];
    } else {
      subst92 = sortedCounts[0][1];
    }
    sortedCounts.shift();
  }
  overheadMap = `XX:${sortedCounts[0][1]},`.length * 2;
  if (overheadMap < counts[substTwo] - sortedCounts[0][0]) {
    if (substTwo == 13) {
      subst13 = sortedCounts[0][1];
    } else {
      subst92 = sortedCounts[0][1];
    }
  }

  let newEscSize = counts[subst92] + counts[subst13];

  let payload = [];
  let mapping = Array(256).fill(0);
  mapping.forEach((_, i) => (mapping[i] = i));

  mapping[13] = subst13;
  mapping[92] = subst92;
  mapping[subst13] = 13;
  mapping[subst92] = 92;

  // now lets remap and escape
  for (let i = 0; i < data.length; i++) {
    let byte = mapping[data[i]];

    if (byte == 92) {
      // "\\"
      payload.push(92);
      payload.push(92);
    } else if (byte == 13) {
      // "\r"
      payload.push(92);
      payload.push(114);
    } else if (byte == 62) {
      // This is a special case. Since we put binary data in the HTML comment
      // we must escape any occurence of `-->` in the data. So not evry `>`
      // char, but only comment closing tag byte sequence
      if (mapping[data[i - 1]] == 45 && mapping[data[i - 2]] == 45) {
        payload.push(92);
        payload.push(62);
      } else {
        payload.push(62);
      }
    } else {
      payload.push(byte);
    }
  }

  // prepare mapping for decoder
  let decodeMap = {};
  mapping.forEach((c, i) => {
    c = ISO_TO_UTF[c] ?? c;
    if (c != i) decodeMap[c] = i;
  });

  return {
    payload,
    decodeMap,
  };
}
