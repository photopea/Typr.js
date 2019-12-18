import bin from './typr.bin';

/* eslint-disable no-unused-vars */

const kern = {};

kern.parse = function (data, offset, length, font) {
	const version = bin.readUshort(data, offset); offset += 2;
	if (version == 1) return kern.parseV1(data, offset - 2, length, font);
	const nTables = bin.readUshort(data, offset); offset += 2;

	const map = { glyph1: [], rval: [] };
	for (let i = 0; i < nTables; i++) {
		offset += 2;	// skip version
		const length = bin.readUshort(data, offset); offset += 2;
		const coverage = bin.readUshort(data, offset); offset += 2;
		let format = coverage >>> 8;
		/* I have seen format 128 once, that's why I do */ format &= 0xf;
		if (format == 0) offset = kern.readFormat0(data, offset, map);
		else throw "unknown kern table format: " + format;
	}
	return map;
}

kern.parseV1 = function (data, offset, length, font) {
	const version = bin.readFixed(data, offset); offset += 4;
	const nTables = bin.readUint(data, offset); offset += 4;

	const map = { glyph1: [], rval: [] };
	for (let i = 0; i < nTables; i++) {
		const length = bin.readUint(data, offset); offset += 4;
		const coverage = bin.readUshort(data, offset); offset += 2;
		const tupleIndex = bin.readUshort(data, offset); offset += 2;
		let format = coverage >>> 8;
		/* I have seen format 128 once, that's why I do */ format &= 0xf;
		if (format == 0) offset = kern.readFormat0(data, offset, map);
		else throw "unknown kern table format: " + format;
	}
	return map;
}

kern.readFormat0 = function (data, offset, map) {
	let pleft = -1;
	const nPairs = bin.readUshort(data, offset); offset += 2;
	const searchRange = bin.readUshort(data, offset); offset += 2;
	const entrySelector = bin.readUshort(data, offset); offset += 2;
	const rangeShift = bin.readUshort(data, offset); offset += 2;
	for (let j = 0; j < nPairs; j++) {
		const left = bin.readUshort(data, offset); offset += 2;
		const right = bin.readUshort(data, offset); offset += 2;
		const value = bin.readShort(data, offset); offset += 2;
		if (left != pleft) { map.glyph1.push(left); map.rval.push({ glyph2: [], vals: [] }) }
		const rval = map.rval[map.rval.length - 1];
		rval.glyph2.push(right); rval.vals.push(value);
		pleft = left;
	}
	return offset;
}

export default kern;