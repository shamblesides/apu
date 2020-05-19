
export const C3 = 44, Cs3 = 156, D3 = 263, Ds3 = 363, E3 = 457, F3 = 547, Fs3 = 631, G3 = 710, Gs3 = 786, A3 = 856, As3 = 923, B3 = 986, C4 = 1046, Cs4 = 1102, D4 = 1155, Ds4 = 1205, E4 = 1253, F4 = 1297, Fs4 = 1339, G4 = 1379, Gs4 = 1417, A4 = 1452, As4 = 1486, B4 = 1517, C5 = 1547, Cs5 = 1575, D5 = 1602, Ds5 = 1627, E5 = 1650, F5 = 1673, Fs5 = 1694, G5 = 1714, Gs5 = 1732, A5 = 1750, As5 = 1767, B5 = 1783, C6 = 1798, Cs6 = 1812, D6 = 1825, Ds6 = 1837, E6 = 1849, F6 = 1860, Fs6 = 1871, G6 = 1881, Gs6 = 1890, A6 = 1899, As6 = 1907, B6 = 1915, C7 = 1923, Cs7 = 1930, D7 = 1936, Ds7 = 1943, E7 = 1949, F7 = 1954, Fs7 = 1959, G7 = 1964, Gs7 = 1969, A7 = 1974, As7 = 1978, B7 = 1982, C8 = 1985, Cs8 = 1989, D8 = 1992, Ds8 = 1995, E8 = 1998, F8 = 2001, Fs8 = 2004, G8 = 2006, Gs8 = 2009, A8 = 2011, As8 = 2013, B8 = 2015;
type APUTrackMask = [0 | 1, 0 | 1, 0 | 1, 0 | 1];
export const audioContext: AudioContext;
export function allow(): void;
export function changeUserVolume(newVolume: number): void;
export const audioNode: AudioNode;
export function bgm(data: ArrayBuffer, loop?: number): {
		play(): {
				pause(): void;
				resume(): void;
		};
};
export function sfx(data: ArrayBuffer, mask?: APUTrackMask): {
		play(): {
				pause(): void;
				resume(): void;
		};
};
export function fromFile(arrayBuffer: ArrayBuffer): {
		play(): {
				pause(): void;
				resume(): void;
		};
};
export {};