window.onload = function () {
  /*  window["_DECODER_MAP"] = {
    4: 13,
    13: 4,
    92: 0,
    338: 188,
    339: 189,
    352: 166,
    353: 168,
    376: 190,
    381: 180,
    382: 184,
    8364: 164,
    65533: 92,
  };

  window["_SWAP_MAP"] = {
    4: 13,
    13: 4,
    92: 0,
    0: 92,
  };

  window["_OFFSET"] = 1;*/

  let decoder = (text, decoderMap) => {
    let i = 0,
      pos = 0,
      data = new Uint8Array(text.length),
      char,
      LUT = [];

    for (i = 0; i < 65536; i++) {
      LUT[i] = decoderMap[i] ?? i;
    }

    i = 0;
    while (i < text.length) {
      char = text.charCodeAt(i++);

      if (char == 92) {
        char = text.charCodeAt(i++);
        char = char == 114 ? 13 : char;
      }

      data[pos++] = LUT[char];
    }

    return data.subarray(0, pos);
  };

  let exec = (binData) => {
    new Response(
      new Blob([binData])
        .stream()
        .pipeThrough(new DecompressionStream("deflate-raw"))
    )
      .arrayBuffer()
      .then((b) => {
        Function(
          "$PLACEHOLDER_OBJECT_NAME",
          new TextDecoder().decode(b.slice(window["_OFFSET"]))
        )(b);
      });
  };

  if (window.location.protocol == "file:") {
    exec(decoder(window["_PAYLOAD_TEXT"], window["_DECODER_MAP"]));
  } else {
    fetch("#")
      .then((t) => t.arrayBuffer())
      .then((t) => {
        let data = new Uint8Array(t, window["_SKIP_HEADER"]);
        data.charCodeAt = (i) => data[i];
        return decoder(data, window["_SWAP_MAP"]);
      })
      .then(exec);
  }
};
