/* global sampleRate */

class GameboyProcessor extends AudioWorkletProcessor {
  constructor (...args) {
		super(...args)

    this.port.onmessage = ({ data: e }) => {
			if (e.type === 'write') {
				this.s.registerWrite(e.layer, e.register, e.value);
			} else if (e.type === 'play') {
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
	const trax = [0,1].map(i => chip(registerWrite.bind(null, i), enableChannel.bind(null, i)));

	function playSong(newSong, loopPoint, resumePoint=0) {
		trax[0].track = newSong;
		trax[0].idx = resumePoint;
		trax[0].timer = 0;
		trax[0].loopPoint = loopPoint;
		trax[0].mask = [1,1,1,1];
		trax[0].doneCallback = null;

		trax[1].track = null;
		trax[1].idx = -1;
		trax[1].timer = 0;
		trax[1].loopPoint = -1;
		trax[1].mask = [0,0,0,0];
		trax[1].doneCallback = null;
		for (let i = 0; i < 4; ++i) {
			disableChannel(1, i);
		}
		registerWrite(0, 0x16, 0)
	}
	function playSFX(newSFX, mask) {
		trax[0].mask = mask.map(n => 1-n);

		trax[1].track = newSFX;
		trax[1].idx = 0;
		trax[1].timer = 0;
		trax[1].loopPoint = -1;
		trax[1].mask = mask;
		trax[1].doneCallback = () => {
			trax[0].mask = [1,1,1,1];
			trax[1].mask = [0,0,0,0];
		}
		for (let i = 0; i < 4; ++i) {
			if (mask[i]) disableChannel(0, i);
		}
	}

	function tick() {
		trax.forEach(s => s.tick());
	}

	return { playSong, playSFX, tick, registerWrite };
}

function chip(registerWrite, enableChannel) {
	const s = {
		track: null,
		idx: -1,
		timer: 0,
		loopPoint: -1,
		mask: [0,0,0,0],
		doneCallback: null,
		tick: tickChip,
	};

	function tickChip() {
		while (s.timer <= 0 && s.idx >= 0) {
			if (s.idx >= s.track.length) {
				s.idx = s.loopPoint;
				if (s.idx === -1) {
					if (s.doneCallback) s.doneCallback();
					break;
				}
			}
			const op = s.track[s.idx++];
			if (op === 0xB3) { // gameboy apu register write
				const reg = s.track[s.idx++];
				const val = s.track[s.idx++];
				registerWrite(reg, val);
				if (val & 0x80) {
					if      (reg === 0x04 && s.mask[0]) enableChannel(0);
					else if (reg === 0x09 && s.mask[1]) enableChannel(1);
					else if (reg === 0x0E && s.mask[2]) enableChannel(2);
					else if (reg === 0x13 && s.mask[3]) enableChannel(3);
				}
			} else if (op === 0x61) {
				const t = (s.track[s.idx++]) + (s.track[s.idx++] << 8); 
				s.timer += t;
			} else if (op === 0x62) {
				const t = 735; // exactly 44100/60
				s.timer += t;
			} else if ((op&0xF0) === 0x70) {
				const t = 1+(op&0xf);
				s.timer += t;
			} else if (op === 0x66) {
				s.idx = s.track.length;
			} else {
				throw new Error('What is op ' + op.toString(16))
			}
		}

		const t = 44100 / sampleRate;
		s.timer -= t;
	}

	return s;
}
