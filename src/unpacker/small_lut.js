window.onload = function () {
  let b = (text) => {
    let i = 0,
      pos = 0,
      data = [],
      char,
      LUT = [];

    for (i = 7e4; i > 0; --i)
      LUT[i] =
        {
          65533: 0,
          8364: 164,
          352: 166,
          353: 168,
          381: 180,
          382: 184,
          338: 188,
          339: 189,
          376: 190,
        }[i] ?? i;

    while (i < text.length) {
      char = text.charCodeAt(i++);

      if (char == 92) {
        char = text.charCodeAt(i++);
        char = char == 114 ? 13 : char;
      }

      data[pos++] = LUT[char];
    }

    return new Uint8Array(data);
  };

  new Response(
    new Blob([b(document.body.lastChild.textContent)])
      .stream()
      .pipeThrough(new DecompressionStream("deflate-raw"))
  )
    .text()
    .then(eval);
};
