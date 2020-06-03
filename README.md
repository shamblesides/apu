APU
===

Want some hardware-accurate Gameboy music and sounds in your HTML5 game or app? Don't want to load megabytes of .mp3 files? [Overwhelmed or frustrated](https://blog.mecheye.net/2017/09/i-dont-know-who-the-web-audio-api-is-designed-for/) by the Web Audio API? Welcome to **apu**!


Features
--------

* Tiny; single .js file, about 9 kB (gzip)
* Supports playing .vgm files (which are typically a few kB after gzip)
* Mute BGM channels while playing SFX
* Highly performant
* * Fast sample generation in WebAssembly
* * When possible, uses AudioWorklet to run completely outside the main thread (works in latest Chrome and FireFox)
* UMD module; works as script tag, AMD module, in webpack, etc
* TypeScript bindings


Browser support
---------------

Latest Chrome, Safari, Firefox


Developing
----------

To develop this project you'll need:

* Unix system (MacOS and Ubuntu definitely work)
* Node 12+ (older versions may work but untested)
* Make
* Clang
* LLVM 8+ (should include wasm-ld; or, on Ubuntu 20.04, wasm-ld-10)
* Binaryen (should include wasm-opt)

To build it:
```sh
make
```

To watch & rebuild:
```sh
npm run watch
```

To watch, rebuild, and run a live-updating web server:
```sh
npm start
```

Troubleshooting:

* On Mac, when installing llvm through Brew, you might find that wasm-ld is still not available. Try `brew link --force llvm`


Acknowledgments
---------------

The high-performance WebAssembly bundle for emulating the GameBoy's APU is compiled from C code that was adapted from
an old version of VGMPlay, which was written by Anthony Kruize in 2002. Without that code, this module would not be
nearly as performant nor as accurate as it is today.


License
-------
[BSD 3-Clause](/LICENSE)
