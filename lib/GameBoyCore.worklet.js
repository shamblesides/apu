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
					GB.device_start_gameboy_sound(0, 0);
					GB.device_reset_gameboy_sound(0);
					// GB.gameboy_sound_set_mute_mask(0, 0b1101);
					this.lchan = new Float32Array(GB.memory.buffer, GB.lchan, 128);
					this.rchan = new Float32Array(GB.memory.buffer, GB.rchan, 128);
					this.updateGB = GB.update;
					this.writeRegister = GB.gb_sound_w.bind(GB, 0);
					this.s = songContext(this.writeRegister);
					this.port.postMessage('ready');
				})
				this.ready = exportsPromise.then(() => true);
			}
		}
  }
  process (inputs, outputs, parameters) {
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

function songContext(registerWrite) {
	let song = null;
	let songIdx = -1;
	let songTimer = 0;
	let songLoopPoint = -1;
	let sfx = null;
	let sfxIdx = -1;
	let sfxTimer = 0;
	let sfxMask = [0,0,0,0];
	let restoreSongState = null;
	function playSong(newSong, loopPoint, resumePoint=0) {
		song = newSong;
		songIdx = resumePoint;
		songTimer = 0;
		songLoopPoint = loopPoint;
		sfx = null;
		sfxIdx = -1;
		sfxTimer = 0;
		sfxMask = [0,0,0,0];
		restoreSongState = null;
	}
	function playSFX(newSFX, mask) {
		sfx = newSFX;
		sfxIdx = 0;
		sfxTimer = 0;
		sfxMask = mask;
		// if (restoreSongState == null) {
		// 	const undos = channels.map(ch => ch.pushState());
		// 	restoreSongState = () => {
		// 		undos.forEach(fn => fn());
		// 		restoreSongState = null;
		// 	}
		// }
	}

	function tick() {
		while (songTimer === 0 && songIdx >= 0) {
			if (songIdx >= song.length) {
				songIdx = songLoopPoint;
				if (songIdx === -1) break;
			}
			const op = song[songIdx++];
			if (op === 0xB3) { // gameboy apu register write
				const reg = song[songIdx++];
				const val = song[songIdx++];
				registerWrite(reg, val);
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
		while (sfxTimer === 0 && sfxIdx >= 0) {
			if (sfxIdx >= sfx.length) {
				sfxIdx = -1;
				sfxMask = [0,0,0,0];
				// restoreSongState();
				break;
			}
			const op = sfx[sfxIdx++];
			if (op === 0xB3) { // gameboy apu register write
				const reg = sfx[sfxIdx++];
				const val = sfx[sfxIdx++];
				registerWrite(reg, val);
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
				sfxIdx = -1;
				sfxMask = [0,0,0,0];
				restoreSongState();
			} else {
				throw new Error('What is op ' + op.toString(16))
			}
		}

		songTimer--;
		sfxTimer--;
	}

	return { playSong, playSFX, tick };
}

function registerWrite(address, data, channelMask) {
	if (miscRegisterFuncs[address]) {
		miscRegisterFuncs[address](data)
	} else {
		let didSet = 0;
		for (let i = 0; i < 4; ++i) {
			if (channels[i].setMem[address]) {
				if (channelMask[i]) {
					channels[i].setMem[address](data);
				}
				++didSet;
			}
		}
		if (!didSet) {
			throw new Error(`Unsupported register write: FF${address.toString(16).padStart(2,0)}`)
		}
	}
	// console.log(`FF${address.toString(16).padStart(2)} <= ${data}`)
}
