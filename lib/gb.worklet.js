/* global sampleRate */

class GameboyProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super(options)

    this.updateGB = null;
    this.lchan = null;
    this.rchan = null;

    var _this = this;
    var songBuffer, sfxBuffer;
    var playSong, playSFX;
    var registerWrite;

    _this.port.onmessage = function (event) {
      var e = event.data;
      if (e.type === 'write') {
        registerWrite(e.layer, e.register, e.value);
      } else if (e.type === 'playBGM') {
        songBuffer.set(new Uint8Array(e.data));
        playSong(e.data.byteLength, e.loop)
      } else if (e.type === 'playSFX') {
        sfxBuffer.set(new Uint8Array(e.data));
        playSFX(e.data.byteLength, e.mask[0], e.mask[1], e.mask[2], e.mask[3])
      } else if (e.type === 'stopBGM') {
        playSong(0, -1)
      } else if (e.type === 'stopSFX') {
        playSFX(0, 0, 0, 0, 0)
      } else if (e.type === 'wasm') {
        WebAssembly.instantiate(e.data).then(function (m) {
          var GB = m.instance.exports;
          GB.init(sampleRate);

          _this.updateGB = GB.update;
          _this.lchan = new Float32Array(GB.memory.buffer, GB.lchan, 128);
          _this.rchan = new Float32Array(GB.memory.buffer, GB.rchan, 128);

          var tenMB = 10 * 1024 * 1024;
          songBuffer = new Uint8Array(GB.memory.buffer, GB.tracks, tenMB);
          sfxBuffer = new Uint8Array(GB.memory.buffer, GB.tracks + tenMB, tenMB);

          playSong = GB.play_song;
          playSFX = GB.play_sfx;
          registerWrite = GB.gb_sound_w;

          _this.port.postMessage('ready');
        });
      }
    }
  }
  process(inputs, outputs) {
    if (this.updateGB) {
      var out1 = outputs[0][0];
      var out2 = outputs[0][1];
      // we have this extra outBufferOffset loop because
      // even tho it seems to always be 128 samples on chrome,
      // we do need to consider platforms that use the
      // polyfill which uses the script processor node
      // under the hood
      for (var outBufferOffset = 0; outBufferOffset < out1.length; outBufferOffset += 128) {
        var failed = this.updateGB();
        if (failed) {
          throw new Error("updateGB failed with code " + failed);
        }
        out1.set(this.lchan, outBufferOffset);
        out2.set(this.rchan, outBufferOffset);
      }
    }
    return true
  }
}

registerProcessor('gameboy-processor', GameboyProcessor)
