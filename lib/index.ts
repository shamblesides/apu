const workletSource = `<%- worklet -%>`;
const wasmEncoded = '<%- wasm -%>';

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext
  }
}

type APUTrackMask = [0|1, 0|1, 0|1, 0|1];

export const
  C3=44,   Cs3=156,  D3=263,  Ds3=363,  E3=457,  F3=547,  Fs3=631,  G3=710,  Gs3=786,  A3=856,  As3=923,  B3=986,
  C4=1046, Cs4=1102, D4=1155, Ds4=1205, E4=1253, F4=1297, Fs4=1339, G4=1379, Gs4=1417, A4=1452, As4=1486, B4=1517,
  C5=1547, Cs5=1575, D5=1602, Ds5=1627, E5=1650, F5=1673, Fs5=1694, G5=1714, Gs5=1732, A5=1750, As5=1767, B5=1783,
  C6=1798, Cs6=1812, D6=1825, Ds6=1837, E6=1849, F6=1860, Fs6=1871, G6=1881, Gs6=1890, A6=1899, As6=1907, B6=1915,
  C7=1923, Cs7=1930, D7=1936, Ds7=1943, E7=1949, F7=1954, Fs7=1959, G7=1964, Gs7=1969, A7=1974, As7=1978, B7=1982,
  C8=1985, Cs8=1989, D8=1992, Ds8=1995, E8=1998, F8=2001, Fs8=2004, G8=2006, Gs8=2009, A8=2011, As8=2013, B8=2015;

let lastVolume = 1;

function makeAudioContext(): AudioContext|null {
  if ('webkitAudioContext' in window) {
    return new window['webkitAudioContext']();
  } else {
    try {
      return new AudioContext({latencyHint:'interactive'});
    } catch (err) {
      try {
        return new AudioContext();
      } catch (err) {
        return null;
      }
    }
  }
}

function APU () {
  const audioContext = makeAudioContext();
  if (!audioContext) return {};
  if (!audioContext.createGain) return {};
  if (!('WebAssembly' in window)) return {};

  const userVolumeNode = audioContext.createGain();
  userVolumeNode.gain.setValueAtTime(lastVolume, audioContext.currentTime)
  userVolumeNode.connect(audioContext.destination);

  const workletBlob = new Blob([workletSource], { type: 'application/javascript' });
  const workletURL = URL.createObjectURL(workletBlob);
  const nodePromise = audioContext.audioWorklet.addModule(workletURL).then(() => {
    const wasmBuffer = new Uint8Array(atob(wasmEncoded).split('').map(s => s.charCodeAt(0))).buffer;
    const node = new AudioWorkletNode(audioContext, 'gameboy-processor', {outputChannelCount:[2]})
    node.connect(userVolumeNode)
    return new Promise<AudioWorkletNode>(resolve => {
      node.port.onmessage = ({data:e}) => (e === 'ready') && resolve(node);
      node.port.postMessage({ type: 'wasm', data: wasmBuffer });
    });
  }).catch(() => {
    // if we fail to load the worklet (maybe the shim failed) then never resolve ready
    return new Promise<never>(() => {})
  })

  return {
    audioContext,
    userVolumeNode,
    nodePromise,
  };
}

const apu = APU()

/**
 * Audio Context that all APU stuff runs on
 */
export const audioContext = apu.audioContext;

export const available = !!audioContext;

/**
 * Resumes the audio context. Should be called as a result of some user event, like a click.
 * Until this is called, the browser won't allow any sound to play.
 */
export function allow() {
  if (!available) return;

  if (document.visibilityState === 'visible') audioContext?.resume();
  
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
      audioContext?.resume();
    } else {
      audioContext?.suspend();
    }
  });
}

const userVolumeNode = apu.userVolumeNode;
/**
 * Volume multiplier intended to be changed by a user-facing volume control
 * @param newVolume Value between 0 and 1
 */
export function changeUserVolume(newVolume: number) {
  if (!available || !userVolumeNode || !audioContext) return;

	if (newVolume >= 0 && newVolume <= 1) {
		userVolumeNode.gain.setValueAtTime(lastVolume, audioContext.currentTime)
		userVolumeNode.gain.linearRampToValueAtTime(newVolume, audioContext.currentTime + 0.05)
		lastVolume = newVolume;
	}
}
/**
 * The last audio node, which is connected to the AudioContext's destination
 */
export const audioNode: AudioNode|undefined = userVolumeNode;

const nodePromise = apu.nodePromise || (new Promise(() => {}));

let nextInstanceId = 0;

let currentFadeCallback: null | (() => void) = null;

let allowSFX = true;

function track(data: ArrayBuffer, loop: number, mask: APUTrackMask|null=null) {
  return {
    play() {
      const isSFX = mask != null;
      if (isSFX && !allowSFX) return null;

      if (data.byteLength > 0) {
        allowSFX = true;
        currentFadeCallback = null;
      }

      const id = ++nextInstanceId;
      nodePromise.then(node => {
        node.port.postMessage({ id, type: 'play', data, loop, mask });
      });
      return {
        pause() {
          nodePromise.then(node => node.port.postMessage({ id, type: 'pause' }));
        },
        resume() {
          nodePromise.then(node => node.port.postMessage({ id, type: 'resume' }));
        },
      }
    }
  }
}

/**
 * Create a BGM object
 *
 * When a BGM is played, it will immediately stop any previous BGM and SFX
 *
 * TODO: resume paused BGM
 * @param data Data block of a VGM file
 * @param loop Byte offset of the data block to loop back to upon completion. (-1 if no loop)
 */
export function bgm(data: ArrayBuffer, loop=0) {
  return track(data, loop);
}

/**
 * Create an SFX object
 *
 * When a SFX is played, it will immediately stop any previous SFX
 *
 * It will also immediately take control away from the BGM for playing on channels,
 * and should silence those channels. When the SFX completes, it will give control
 * back to the BGM for all channels.
 *
 * Right now a channel mask is used for an SFX to declare which channels it intends
 * to use. A smarter mechanism may be used in the future, such as scanning the data.
 * @param data Data block of a VGM file
 * @param mask Array of four 0's or 1's that indicates which channels this SFX will be using
 */
export function sfx(data: ArrayBuffer, mask: APUTrackMask=[1,1,1,1]) {
  return track(data, -1, mask)
}

/**
 * Creates a BGM object from an entire .vgm file contents, as an ArrayBuffer
 * @param arrayBuffer
 */
export function fromFile(arrayBuffer: ArrayBuffer) {
	// make sure the 4-byte header is correct.
	// It should be "Vgm " (space at the end)
  const header = new Uint8Array(arrayBuffer, 0, 4);
  for (let i = 0; i < 4; ++i) {
    if (header[i] !== 'Vgm '.charCodeAt(i)) {
      throw new Error('Invalid header');
    }
  }
  // get where vgm data starts. this is 
  // (address of where vgm offset is stored, always 0x34)
  // + (value of vgm offset.)
  const data0 = 0x34 + new Uint32Array(arrayBuffer, 0x34, 1)[0];
  // the loop point works similarly
	const loopPoint = 0x1c + new Uint32Array(arrayBuffer, 0x1c, 1)[0] - data0;
  // finally, the rest of the file is the data
  const data = arrayBuffer.slice(data0);
	
	return bgm(data, loopPoint);
}

/**
 * Slowly fade out the BGM. This also immediately stops current
 * SFX, and prevents any new SFX from playing until completion.
 * @param millis Number of milliseconds for the fade to complete
 * @returns A promise that resolves when the fade has completed
 */
export function fade(millis: number = 2000) {
  return nodePromise.then(node => {
    // halt any currently-playing SFX
    sfx(new ArrayBuffer(0), [0,0,0,0]).play();

    const wasAlreadyFading = (currentFadeCallback != null);
    if (!wasAlreadyFading) {
      // id of currently running song;
      // we don't want to keep fading if we switch songs
      // mid-fade
      const id = nextInstanceId;

      if (millis > 0) {
        // disallow sfx until fade completes
        allowSFX = false;

        // use NR50 to fade out
        for (let i = 0; i <= 5; ++i) {
          const vol = 6 - i;
          setTimeout(() => {
            if (id !== nextInstanceId) return;
            node.port.postMessage({ type: 'write', layer: 0, register: 0x14, value: (vol<<4)+(vol) })
          }, millis*i/7);
        }

        // stop sound with NR52
        setTimeout(() => {
          if (id !== nextInstanceId) return;
          node.port.postMessage({ type: 'write', layer: 0, register: 0x16, value: 0 })
          // and clear song
          bgm(new ArrayBuffer(0), -1).play();
        }, millis*6/7);

        // done
        setTimeout(() => {
          if (id+1 !== nextInstanceId) return;
          if (currentFadeCallback) {
            currentFadeCallback();
          }
        }, millis)
      }
    }

    return new Promise<void>(resolve => {
      currentFadeCallback = () => {
        currentFadeCallback = null;
        allowSFX = true;
        resolve();
      };
    });
  });
}
