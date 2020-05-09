import 'audioworklet-polyfill';
import workletSource from './GameBoyCore.worklet.js';
import wasmURL from './gb.c';

export * from './notes.js';

window.AudioContext = window.AudioContext || window.webkitAudioContext;
export const audioContext = new AudioContext({latencyHint:'interactive'});
export function allow() {
	audioContext.resume();
}

let lastVolume = 1;
const userVolumeNode = audioContext.createGain();
userVolumeNode.gain.setValueAtTime(lastVolume, audioContext.currentTime)
userVolumeNode.connect(audioContext.destination);
export function changeUserVolume(newVolume) {
	if (newVolume >= 0 && newVolume <= 1) {
		userVolumeNode.gain.setValueAtTime(lastVolume, audioContext.currentTime)
		userVolumeNode.gain.linearRampToValueAtTime(newVolume, audioContext.currentTime + 0.05)
		lastVolume = newVolume;
	}
}
export const audioNode = userVolumeNode;

const workletBlob = new Blob([workletSource], { type: 'application/javascript' });
const workletURL = URL.createObjectURL(workletBlob);
const nodePromise = audioContext.audioWorklet.addModule(workletURL).then(() => {
  const node = new AudioWorkletNode(audioContext, 'gameboy-processor', {outputChannelCount:[2]})
  node.connect(userVolumeNode)
  return new Promise(resolve => {
    node.port.onmessage = ({data:e}) => (e === 'ready') && resolve(node);
    const xhr = new XMLHttpRequest();
    xhr.open('GET', wasmURL);
    xhr.responseType = 'arraybuffer';
    xhr.onload = () => node.port.postMessage({ type: 'module', data: xhr.response })
    xhr.send();
  });
})

let nextInstanceId;
function track(data, loop, mask=null) {
  return {
    play() {
      let id = ++nextInstanceId;
      nodePromise.then(node => {
        node.port.postMessage({ id, type: 'play', data, loop, mask });
      });
      return {
        pause() {
          node.port.postMessage({ id, type: 'pause' });
        },
        resume() {
          node.port.postMessage({ id, type: 'resume' });
        },
      }
    }
  }
}
export function bgm(data, loop=0) {
  return track(data, loop);
}
export function sfx(data, mask=[1,1,1,1]) {
  return track(data, -1, mask)
}

export function fromFile(arrayBuffer) {
	// make sure the 4-byte header is correct.
	// It should be "Vgm " (space at the end)
  const header = new Uint8Array(arrayBuffer, 0, 4);
  for (let i = 0; i < 4; ++i) {
    if (header[i] !== 'Vgm '[i].charCodeAt()) {
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

// function setWaveTable(bytes) {
//   if (bytes.length !== 16 || !bytes.every(n => n >= 0 && n <= 0xFF)) {
//     throw new Error('Expected 32 samples with values 0-255')
//   }
//   for (let i = 0; i < 16; ++i) {
//     setWaveTableByte(i, bytes[i])
//   }
// }

