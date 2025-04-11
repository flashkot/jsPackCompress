import { wasm } from "./zopfli.wasm.js";

export async function instantiate() {
  let zopfliApi;

  const env = {
    emscripten_notify_memory_growth: memUpd,
    proc_exit: exit,
    fd_write: noop,
    fd_seek: noop,
    fd_close: noop,
    environ_sizes_get() {
      return 0;
    },
    environ_get() {
      return 0;
    },
  };

  const imports = {
    env,
    wasi_snapshot_preview1: env,
  };

  const { instance } = await WebAssembly.instantiateStreaming(
    fetch("data:application/wasm;base64," + wasm),
    imports
  );

  function memUpd() {
    zopfliApi.HEAPU8 = new Uint8Array(instance.exports.memory.buffer);
  }

  function exit() {
    throw "EXIT";
  }

  function noop() {
    throw "noop";
  }

  zopfliApi = {
    create_buffer: instance.exports.create_buffer,
    destroy_buffer: instance.exports.destroy_buffer,
    compress: instance.exports.compress,
    get_result_pointer: instance.exports.get_result_pointer,
    get_result_size: instance.exports.get_result_size,
  };

  memUpd();

  function zopfliComress(input, mode = 2) {
    let p = zopfliApi.create_buffer(input.length);
    zopfliApi.HEAPU8.set(input, p);

    zopfliApi.compress(p, input.length, mode);

    let resultPointer = zopfliApi.get_result_pointer();
    let resultSize = zopfliApi.get_result_size();
    let result = new Uint8Array(
      zopfliApi.HEAPU8.buffer.slice(resultPointer, resultPointer + resultSize)
    );

    zopfliApi.destroy_buffer(resultPointer);
    zopfliApi.destroy_buffer(p);

    return result;
  }

  return zopfliComress;
}
