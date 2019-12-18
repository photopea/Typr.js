import bin from './typr.bin';

/* eslint-disable no-unused-vars */

const cmap = {};

cmap.parse = function (data, offset, length) {
	data = new Uint8Array(data.buffer, offset, length);
	offset = 0;

	const obj = {};
	const version = bin.readUshort(data, offset); offset += 2;
	const numTables = bin.readUshort(data, offset); offset += 2;

	const offs = [];
	obj.tables = [];

	for (let i = 0; i < numTables; i++) {
		const platformID = bin.readUshort(data, offset); offset += 2;
		const encodingID = bin.readUshort(data, offset); offset += 2;
		const noffset = bin.readUint(data, offset); offset += 4;

		const id = "p" + platformID + "e" + encodingID;

		let tind = offs.indexOf(noffset);

		if (tind == -1) {
			tind = obj.tables.length;
			let subt;
			offs.push(noffset);
			const format = bin.readUshort(data, noffset);
			if (format == 0) subt = cmap.parse0(data, noffset);
			else if (format == 4) subt = cmap.parse4(data, noffset);
			else if (format == 6) subt = cmap.parse6(data, noffset);
			else if (format == 12) subt = cmap.parse12(data, noffset);
			else console.log("unknown format: " + format, platformID, encodingID, noffset);
			obj.tables.push(subt);
		}

		if (obj[id] != null) throw "multiple tables for one platform+encoding";
		obj[id] = tind;
	}
	return obj;
}

cmap.parse0 = function (data, offset) {
	const obj = {};
	obj.format = bin.readUshort(data, offset); offset += 2;
	const len = bin.readUshort(data, offset); offset += 2;
	const lang = bin.readUshort(data, offset); offset += 2;
	obj.map = [];
	for (let i = 0; i < len - 6; i++) obj.map.push(data[offset + i]);
	return obj;
}

cmap.parse4 = function (data, offset) {
	const offset0 = offset;
	const obj = {};

	obj.format = bin.readUshort(data, offset); offset += 2;
	const length = bin.readUshort(data, offset); offset += 2;
	const language = bin.readUshort(data, offset); offset += 2;
	const segCountX2 = bin.readUshort(data, offset); offset += 2;
	const segCount = segCountX2 / 2;
	obj.searchRange = bin.readUshort(data, offset); offset += 2;
	obj.entrySelector = bin.readUshort(data, offset); offset += 2;
	obj.rangeShift = bin.readUshort(data, offset); offset += 2;
	obj.endCount = bin.readUshorts(data, offset, segCount); offset += segCount * 2;
	offset += 2;
	obj.startCount = bin.readUshorts(data, offset, segCount); offset += segCount * 2;
	obj.idDelta = [];
	for (let i = 0; i < segCount; i++) { obj.idDelta.push(bin.readShort(data, offset)); offset += 2; }
	obj.idRangeOffset = bin.readUshorts(data, offset, segCount); offset += segCount * 2;
	obj.glyphIdArray = [];
	while (offset < offset0 + length) { obj.glyphIdArray.push(bin.readUshort(data, offset)); offset += 2; }
	return obj;
}

cmap.parse6 = function (data, offset) {
	const offset0 = offset;
	const obj = {};

	obj.format = bin.readUshort(data, offset); offset += 2;
	const length = bin.readUshort(data, offset); offset += 2;
	const language = bin.readUshort(data, offset); offset += 2;
	obj.firstCode = bin.readUshort(data, offset); offset += 2;
	const entryCount = bin.readUshort(data, offset); offset += 2;
	obj.glyphIdArray = [];
	for (let i = 0; i < entryCount; i++) { obj.glyphIdArray.push(bin.readUshort(data, offset)); offset += 2; }

	return obj;
}

cmap.parse12 = function (data, offset) {
	const offset0 = offset;
	const obj = {};

	obj.format = bin.readUshort(data, offset); offset += 2;
	offset += 2;
	const length = bin.readUint(data, offset); offset += 4;
	const lang = bin.readUint(data, offset); offset += 4;
	const nGroups = bin.readUint(data, offset); offset += 4;
	obj.groups = [];

	for (let i = 0; i < nGroups; i++) {
		const off = offset + i * 12;
		const startCharCode = bin.readUint(data, off + 0);
		const endCharCode = bin.readUint(data, off + 4);
		const startGlyphID = bin.readUint(data, off + 8);
		obj.groups.push([startCharCode, endCharCode, startGlyphID]);
	}
	return obj;
}

export default cmap;
