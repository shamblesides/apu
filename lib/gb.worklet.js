/* global sampleRate */

class GameboyProcessor extends AudioWorkletProcessor {
  constructor (...args) {
		super(...args)

    this.port.onmessage = ({ data: e }) => {
			if (e.type === 'write') {
				this.registerWrite(e.layer, e.register, e.value);
			} else if (e.type === 'play') {
				const arr = new Uint8Array(e.data);
				this.ready.then(() => {
					if (e.mask) {
						this.sfxBuffer.set(arr);
						this.playSFX(arr.length, e.mask[0], e.mask[1], e.mask[2], e.mask[3])
					} else {
						this.songBuffer.set(arr);
						this.playSong(arr.length, e.loop)
					}
				})
			} else if (e.type === 'module') {
				const exportsPromise = WebAssembly.instantiate(e.data).then(m => m.instance.exports);
				exportsPromise.then(GB => {
					GB.init(sampleRate);
					const tenMB = 10 * 1024 * 1024;
					this.lchan = new Float32Array(GB.memory.buffer, GB.lchan, 128);
					this.rchan = new Float32Array(GB.memory.buffer, GB.rchan, 128);
					this.songBuffer = new Uint8Array(GB.memory.buffer, GB.tracks, tenMB);
					this.sfxBuffer = new Uint8Array(GB.memory.buffer, GB.tracks + tenMB, tenMB);
					this.updateGB = GB.update;
					this.playSong = GB.play_song;
					this.playSFX = GB.play_sfx;
					this.registerWrite = GB.gb_sound_w;
					this.port.postMessage('ready');
				})
				this.ready = exportsPromise.then(() => true);
			}
		}
  }
  process (inputs, outputs) {
		if (this.updateGB) {
			const out1 = outputs[0][0];
			const out2 = outputs[0][1];
			// we have this extra outBufferOffset loop because
			// even tho it seems to always be 128 samples on chrome,
			// we do need to consider platforms that use the
			// polyfill which uses the script processor node
			// under the hood
			for (let outBufferOffset = 0; outBufferOffset < out1.length; outBufferOffset += 128) {
				const failed = this.updateGB();
				if (failed) {
					throw new Error("updateGB failed with code "+failed);
				}
				out1.set(this.lchan, outBufferOffset);
				out2.set(this.rchan, outBufferOffset);
			}
		}
		return true
  }
}

registerProcessor('gameboy-processor', GameboyProcessor)
