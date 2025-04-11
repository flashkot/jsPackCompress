#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#else
#define EMSCRIPTEN_KEEPALIVE
#endif

#include "src/zopfli/zopfli.h"
#include "src/zopfli/deflate.h"
// #include "src/zopfli/zlib_container.h"
#include <stdlib.h>

////////////////////////////////////////////////////////////////////////////////

EMSCRIPTEN_KEEPALIVE
unsigned char *create_buffer(int size)
{
  return malloc(size * sizeof(unsigned char));
}

EMSCRIPTEN_KEEPALIVE
void destroy_buffer(unsigned char *p)
{
  free(p);
}

////////////////////////////////////////////////////////////////////////////////

int result[2];

EMSCRIPTEN_KEEPALIVE
int get_result_pointer()
{
  return result[0];
}

EMSCRIPTEN_KEEPALIVE
int get_result_size()
{
  return result[1];
}

////////////////////////////////////////////////////////////////////////////////

EMSCRIPTEN_KEEPALIVE
void compress(unsigned char *in, size_t insize, int mode)
{
  if (mode < 2)
  {
    mode = 2;
  }

  if (mode > 9)
  {
    mode = 9;
  }

  ZopfliOptions options;
  ZopfliInitOptions(&options, mode, 0, 0);

  unsigned char *out = create_buffer(insize / 4);
  size_t outsize = 0;

  unsigned char bp = 0;
  ZopfliDeflate(&options, 1, in, insize, &bp, &out, &outsize);
  // ZopfliGzipCompress(mode, 0, in, insize, 0, &out, &outsize, "");
  result[0] = (int)out;
  result[1] = (int)outsize;
}
