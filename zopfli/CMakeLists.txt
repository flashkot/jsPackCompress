cmake_minimum_required(VERSION 3.31)

project(ect-wasm)

include_directories(ect)
file(GLOB SOURCES
  src/module.c
  ect/src/LzFind.c
  ect/src/zopfli/*.c
  ect/src/zopfli/*.cpp
)
add_executable(zopfli ${SOURCES})

set(CMAKE_EXECUTABLE_SUFFIX ".wasm")

# Enable ZLIB_CONST for everything
add_definitions(-DZLIB_CONST)
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wall -Wno-sign-compare -Wno-unused -Wno-unused-parameter")
set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -Wall -Wno-sign-compare -Wno-unused -Wno-unused-parameter")


# This will suppress `assert` macro.
add_compile_definitions(NDEBUG)

# Do not use multithreading in ECT.
target_compile_definitions(zopfli PRIVATE NOMULTI=1)

set(EMSCRIPTEN_FLAGS
  "-g0 -Ofast -flto -WASM=1 -Wl,--lto-O3 --no-entry -s ALLOW_MEMORY_GROWTH=1 -s STANDALONE_WASM=1 -s STACK_SIZE=524288"
)

target_link_libraries(zopfli ${EMSCRIPTEN_FLAGS})

add_custom_command(TARGET zopfli
  POST_BUILD
  COMMAND $ENV{EMSDK}/upstream/bin/wasm-opt zopfli.wasm -o zopfli.wasm -all --post-emscripten -O4
  COMMAND npm run wasm2js
  COMMAND npm run build
  WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
)
