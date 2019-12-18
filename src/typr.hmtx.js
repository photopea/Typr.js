import bin from './typr.bin';

const hmtx = {};

hmtx.parse = function (data, offset, length, font) {
	const obj = {};

	obj.aWidth = [];
	obj.lsBearing = [];


	let aw = 0, lsb = 0;

	for (let i = 0; i < font.maxp.numGlyphs; i++) {
		if (i < font.hhea.numberOfHMetrics) { aw = bin.readUshort(data, offset); offset += 2; lsb = bin.readShort(data, offset); offset += 2; }
		obj.aWidth.push(aw);
		obj.lsBearing.push(lsb);
	}

	return obj;
}

export default hmtx;