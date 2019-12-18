import bin from './typr.bin';

const loca = {};

loca.parse = function (data, offset, length, font) {
	const obj = [];

	const ver = font.head.indexToLocFormat;
	const len = font.maxp.numGlyphs + 1;

	if (ver == 0) for (let i = 0; i < len; i++) obj.push(bin.readUshort(data, offset + (i << 1)) << 1);
	if (ver == 1) for (let i = 0; i < len; i++) obj.push(bin.readUint(data, offset + (i << 2)));

	return obj;
}

export default loca;