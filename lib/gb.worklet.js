/* global sampleRate */

class GameboyProcessor extends AudioWorkletProcessor {
  constructor (...args) {
		super(...args)

    this.port.onmessage = ({ data: e }) => {
			if (e.type === 'play') {
				const arr = new Uint8Array(e.data);
				this.ready.then(() => {
					if (e.mask) {
						this.s.playSFX(arr, e.mask)
					} else {
						this.s.playSong(arr, e.loop)
					}
				})
			} else if (e.type === 'module') {
				const exportsPromise = WebAssembly.instantiate(e.data).then(m => m.instance.exports);
				exportsPromise.then(GB => {
					GB.init(sampleRate);
					this.lchan = new Float32Array(GB.memory.buffer, GB.lchan, 128);
					this.rchan = new Float32Array(GB.memory.buffer, GB.rchan, 128);
					this.updateGB = GB.update;
					this.s = songContext(GB.gb_sound_w, GB.enable_channel, GB.disable_channel);
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
				for (let i = 0; i < 128; ++i) {
					this.s.tick();
				}
				this.updateGB();
				// console.log(this.lchan[0], this.rchan[0])
				out1.set(this.lchan, outBufferOffset);
				out2.set(this.rchan, outBufferOffset);
			}
		}
		return true
  }
}

registerProcessor('gameboy-processor', GameboyProcessor)

function songContext(registerWrite, enableChannel, disableChannel) {
	let song = null;
	let songIdx = -1;
	let songTimer = 0;
	let songLoopPoint = -1;
	let sfx = null;
	let sfxIdx = -1;
	let sfxTimer = 0;
	let sfxMask = [0,0,0,0];
	function playSong(newSong, loopPoint, resumePoint=0) {
		song = newSong;
		songIdx = resumePoint;
		songTimer = 0;
		songLoopPoint = loopPoint;
		sfx = null;
		sfxIdx = -1;
		sfxTimer = 0;
		sfxMask = [0,0,0,0];
		for (let i = 0; i < 4; ++i) {
			disableChannel(1, i);
		}
	}
	function playSFX(newSFX, mask) {
		sfx = newSFX;
		sfxIdx = 0;
		sfxTimer = 0;
		sfxMask = mask;
		for (let i = 0; i < 4; ++i) {
			if (mask[i]) disableChannel(0, i);
		}
	}

	function tick() {
		while (songTimer <= 0 && songIdx >= 0) {
			if (songIdx >= song.length) {
				songIdx = songLoopPoint;
				if (songIdx === -1) break;
			}
			const op = song[songIdx++];
			if (op === 0xB3) { // gameboy apu register write
				const reg = song[songIdx++];
				const val = song[songIdx++];
				registerWrite(0, reg, val);
				if (val & 0x80) {
					if      (reg === 0x04 && !sfxMask[0]) enableChannel(0, 0);
					else if (reg === 0x09 && !sfxMask[1]) enableChannel(0, 1);
					else if (reg === 0x0E && !sfxMask[2]) enableChannel(0, 2);
					else if (reg === 0x13 && !sfxMask[3]) enableChannel(0, 3);
				}
			} else if (op === 0x61) {
				const t = (song[songIdx++]) + (song[songIdx++] << 8); 
				songTimer += t;
			} else if (op === 0x62) {
				const t = 735; // exactly 44100/60
				songTimer += t;
			} else if ((op&0xF0) === 0x70) {
				const t = 1+(op&0xf);
				songTimer += t;
			} else if (op === 0x66) {
				songIdx = songLoopPoint;
			} else {
				throw new Error('What is op ' + op.toString(16))
			}
		}
		while (sfxTimer <= 0 && sfxIdx >= 0) {
			if (sfxIdx >= sfx.length) {
				sfxIdx = -1;
				sfxMask = [0,0,0,0];
				break;
			}
			const op = sfx[sfxIdx++];
			if (op === 0xB3) { // gameboy apu register write
				const reg = sfx[sfxIdx++];
				const val = sfx[sfxIdx++];
				registerWrite(1, reg, val);
				if (val & 0x80) {
					if      (reg === 0x04) enableChannel(1, 0);
					else if (reg === 0x09) enableChannel(1, 1);
					else if (reg === 0x0E) enableChannel(1, 2);
					else if (reg === 0x13) enableChannel(1, 3);
				}
			} else if (op === 0x61) {
				const t = (sfx[sfxIdx++]) + (sfx[sfxIdx++] << 8); 
				sfxTimer += t;
			} else if (op === 0x62) {
				const t = 735; // exactly 44100/60
				sfxTimer += t;
			} else if ((op&0xF0) === 0x70) {
				const t = 1+(op&0xf);
				sfxTimer += t;
			} else if (op === 0x66) {
				sfxIdx = sfx.length;
			} else {
				throw new Error('What is op ' + op.toString(16))
			}
		}

		const t = 44100 / sampleRate;
		songTimer -= t;
		sfxTimer -= t;
	}

	return { playSong, playSFX, tick };
}
