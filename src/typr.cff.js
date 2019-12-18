import bin from './typr.bin';

/* eslint-disable no-unused-vars */

const CFF = {};
CFF.parse = function (data, offset, length) {
	data = new Uint8Array(data.buffer, offset, length);
	offset = 0;

	// Header
	const major = data[offset]; offset++;
	const minor = data[offset]; offset++;
	const hdrSize = data[offset]; offset++;
	const offsize = data[offset]; offset++;

	// Name INDEX
	const ninds = [];
	offset = CFF.readIndex(data, offset, ninds);
	const names = [];

	const nindsLength = ninds.length;
	for (let i = 0; i < nindsLength - 1; i++) names.push(bin.readASCII(data, offset + ninds[i], ninds[i + 1] - ninds[i]));
	offset += ninds[nindsLength - 1];


	// Top DICT INDEX
	const tdinds = [];
	offset = CFF.readIndex(data, offset, tdinds);
	// Top DICT Data
	const topDicts = [];
	const tdindsLength = tdinds.length;
	for (let i = 0; i < tdindsLength - 1; i++) topDicts.push(CFF.readDict(data, offset + tdinds[i], offset + tdinds[i + 1]));
	offset += tdinds[tdindsLength - 1];
	const topdict = topDicts[0];

	// String INDEX
	const sinds = [];
	offset = CFF.readIndex(data, offset, sinds);
	// String Data
	const strings = [];
	const sindsLength = sinds.length;
	for (let i = 0; i < sindsLength - 1; i++) strings.push(bin.readASCII(data, offset + sinds[i], sinds[i + 1] - sinds[i]));
	offset += sinds[sindsLength - 1];

	// Global Subr INDEX  (subroutines)
	CFF.readSubrs(data, offset, topdict);

	// charstrings
	if (topdict.CharStrings) {
		offset = topdict.CharStrings;
		const sinds = [];
		offset = CFF.readIndex(data, offset, sinds);

		const cstr = [];
		const sindsLength = sinds.length;
		for (let i = 0; i < sindsLength - 1; i++) cstr.push(bin.readBytes(data, offset + sinds[i], sinds[i + 1] - sinds[i]));
		//offset += sinds[sinds.length-1];
		topdict.CharStrings = cstr;
	}

	// CID font
	if (topdict.ROS) {
		offset = topdict.FDArray;
		const fdind = [];
		offset = CFF.readIndex(data, offset, fdind);

		topdict.FDArray = [];
		const fdindLength = fdind.length;
		for (let i = 0; i < fdindLength - 1; i++) {
			const dict = CFF.readDict(data, offset + fdind[i], offset + fdind[i + 1]);
			CFF._readFDict(data, dict, strings);
			topdict.FDArray.push(dict);
		}
		offset += fdind[fdindLength - 1];

		offset = topdict.FDSelect;
		topdict.FDSelect = [];
		const fmt = data[offset]; offset++;
		if (fmt == 3) {
			const rns = bin.readUshort(data, offset); offset += 2;
			for (let i = 0; i < rns + 1; i++) {
				topdict.FDSelect.push(bin.readUshort(data, offset), data[offset + 2]); offset += 3;
			}
		}
		else throw fmt;
	}

	// Encoding
	if (topdict.Encoding) topdict.Encoding = CFF.readEncoding(data, topdict.Encoding, topdict.CharStrings.length);

	// charset
	if (topdict.charset) topdict.charset = CFF.readCharset(data, topdict.charset, topdict.CharStrings.length);

	CFF._readFDict(data, topdict, strings);
	return topdict;
}
CFF._readFDict = function (data, dict, ss) {
	let offset;
	if (dict.Private) {
		offset = dict.Private[1];
		dict.Private = CFF.readDict(data, offset, offset + dict.Private[0]);
		if (dict.Private.Subrs) CFF.readSubrs(data, offset + dict.Private.Subrs, dict.Private);
	}
	for (let p in dict) if (["FamilyName", "FontName", "FullName", "Notice", "version", "Copyright"].indexOf(p) != -1) dict[p] = ss[dict[p] - 426 + 35];
}

CFF.readSubrs = function (data, offset, obj) {
	const gsubinds = [];
	offset = CFF.readIndex(data, offset, gsubinds);

	let bias = 0;
	const nSubrs = gsubinds.length;

	if (nSubrs < 1240) bias = 107;
	else if (nSubrs < 33900) bias = 1131;
	else bias = 32768;
	obj.Bias = bias;

	obj.Subrs = [];
	const gsubindsLength = gsubinds.length
	for (let i = 0; i < gsubindsLength - 1; i++) obj.Subrs.push(bin.readBytes(data, offset + gsubinds[i], gsubinds[i + 1] - gsubinds[i]));
	//offset += gsubinds[gsubinds.length-1];
}

const tableSE = [
	0, 0, 0, 0, 0, 0, 0, 0,
	0, 0, 0, 0, 0, 0, 0, 0,
	0, 0, 0, 0, 0, 0, 0, 0,
	0, 0, 0, 0, 0, 0, 0, 0,
	1, 2, 3, 4, 5, 6, 7, 8,
	9, 10, 11, 12, 13, 14, 15, 16,
	17, 18, 19, 20, 21, 22, 23, 24,
	25, 26, 27, 28, 29, 30, 31, 32,
	33, 34, 35, 36, 37, 38, 39, 40,
	41, 42, 43, 44, 45, 46, 47, 48,
	49, 50, 51, 52, 53, 54, 55, 56,
	57, 58, 59, 60, 61, 62, 63, 64,
	65, 66, 67, 68, 69, 70, 71, 72,
	73, 74, 75, 76, 77, 78, 79, 80,
	81, 82, 83, 84, 85, 86, 87, 88,
	89, 90, 91, 92, 93, 94, 95, 0,
	0, 0, 0, 0, 0, 0, 0, 0,
	0, 0, 0, 0, 0, 0, 0, 0,
	0, 0, 0, 0, 0, 0, 0, 0,
	0, 0, 0, 0, 0, 0, 0, 0,
	0, 96, 97, 98, 99, 100, 101, 102,
	103, 104, 105, 106, 107, 108, 109, 110,
	0, 111, 112, 113, 114, 0, 115, 116,
	117, 118, 119, 120, 121, 122, 0, 123,
	0, 124, 125, 126, 127, 128, 129, 130,
	131, 0, 132, 133, 0, 134, 135, 136,
	137, 0, 0, 0, 0, 0, 0, 0,
	0, 0, 0, 0, 0, 0, 0, 0,
	0, 138, 0, 139, 0, 0, 0, 0,
	140, 141, 142, 143, 0, 0, 0, 0,
	0, 144, 0, 0, 0, 145, 0, 0,
	146, 147, 148, 149, 0, 0, 0, 0
];

CFF.glyphByUnicode = function (cff, code) {
	const cffCharsetLength = cff.charset.length
	for (let i = 0; i < cffCharsetLength; i++) if (cff.charset[i] == code) return i;
	return -1;
}

CFF.glyphBySE = function (cff, charcode)	// glyph by standard encoding
{
	if (charcode < 0 || charcode > 255) return -1;
	return CFF.glyphByUnicode(cff, tableSE[charcode]);
}

CFF.readEncoding = function (data, offset, num) {
	const array = ['.notdef'];
	const format = data[offset]; offset++;

	if (format == 0) {
		const nCodes = data[offset]; offset++;
		for (let i = 0; i < nCodes; i++)  array.push(data[offset + i]);
	}
	/*
	else if(format==1 || format==2)
	{
		while(charset.length<num)
		{
			const first = bin.readUshort(data, offset);  offset+=2;
			const nLeft=0;
			if(format==1) {  nLeft = data[offset];  offset++;  }
			else          {  nLeft = bin.readUshort(data, offset);  offset+=2;  }
			for(let i=0; i<=nLeft; i++)  {  charset.push(first);  first++;  }
		}
	}
	*/
	else throw "error: unknown encoding format: " + format;

	return array;
}

CFF.readCharset = function (data, offset, num) {
	const charset = ['.notdef'];
	const format = data[offset]; offset++;

	if (format == 0) {
		for (let i = 0; i < num; i++) {
			const first = bin.readUshort(data, offset); offset += 2;
			charset.push(first);
		}
	}
	else if (format == 1 || format == 2) {
		while (charset.length < num) {
			let first = bin.readUshort(data, offset); offset += 2;
			let nLeft = 0;
			if (format == 1) { nLeft = data[offset]; offset++; }
			else { nLeft = bin.readUshort(data, offset); offset += 2; }
			for (let i = 0; i <= nLeft; i++) { charset.push(first); first++; }
		}
	}
	else throw "error: format: " + format;

	return charset;
}

CFF.readIndex = function (data, offset, inds) {
	const count = bin.readUshort(data, offset) + 1; offset += 2;
	const offsize = data[offset]; offset++;

	if (offsize == 1) for (let i = 0; i < count; i++) inds.push(data[offset + i]);
	else if (offsize == 2) for (let i = 0; i < count; i++) inds.push(bin.readUshort(data, offset + i * 2));
	else if (offsize == 3) for (let i = 0; i < count; i++) inds.push(bin.readUint(data, offset + i * 3 - 1) & 0x00ffffff);
	else if (count != 1) throw "unsupported offset size: " + offsize + ", count: " + count;

	offset += count * offsize;
	return offset - 1;
}

CFF.getCharString = function (data, offset, o) {
	const b0 = data[offset], b1 = data[offset + 1], b2 = data[offset + 2], b3 = data[offset + 3], b4 = data[offset + 4];
	let vs = 1;
	let op = null, val = null;
	// operand
	if (b0 <= 20) { op = b0; vs = 1; }
	if (b0 == 12) { op = b0 * 100 + b1; vs = 2; }
	//if(b0==19 || b0==20) { op = b0/*+" "+b1*/;  vs=2; }
	if (21 <= b0 && b0 <= 27) { op = b0; vs = 1; }
	if (b0 == 28) { val = bin.readShort(data, offset + 1); vs = 3; }
	if (29 <= b0 && b0 <= 31) { op = b0; vs = 1; }
	if (32 <= b0 && b0 <= 246) { val = b0 - 139; vs = 1; }
	if (247 <= b0 && b0 <= 250) { val = (b0 - 247) * 256 + b1 + 108; vs = 2; }
	if (251 <= b0 && b0 <= 254) { val = -(b0 - 251) * 256 - b1 - 108; vs = 2; }
	if (b0 == 255) { val = bin.readInt(data, offset + 1) / 0xffff; vs = 5; }

	o.val = val != null ? val : "o" + op;
	o.size = vs;
}

CFF.readCharString = function (data, offset, length) {
	const end = offset + length;
	const arr = [];

	while (offset < end) {
		const b0 = data[offset], b1 = data[offset + 1], b2 = data[offset + 2], b3 = data[offset + 3], b4 = data[offset + 4];
		let vs = 1;
		let op = null, val = null;
		// operand
		if (b0 <= 20) { op = b0; vs = 1; }
		if (b0 == 12) { op = b0 * 100 + b1; vs = 2; }
		if (b0 == 19 || b0 == 20) { op = b0/*+" "+b1*/; vs = 2; }
		if (21 <= b0 && b0 <= 27) { op = b0; vs = 1; }
		if (b0 == 28) { val = bin.readShort(data, offset + 1); vs = 3; }
		if (29 <= b0 && b0 <= 31) { op = b0; vs = 1; }
		if (32 <= b0 && b0 <= 246) { val = b0 - 139; vs = 1; }
		if (247 <= b0 && b0 <= 250) { val = (b0 - 247) * 256 + b1 + 108; vs = 2; }
		if (251 <= b0 && b0 <= 254) { val = -(b0 - 251) * 256 - b1 - 108; vs = 2; }
		if (b0 == 255) { val = bin.readInt(data, offset + 1) / 0xffff; vs = 5; }

		arr.push(val != null ? val : "o" + op);
		offset += vs;
	}
	return arr;
}

const keys = ["version", "Notice", "FullName", "FamilyName", "Weight", "FontBBox", "BlueValues", "OtherBlues", "FamilyBlues", "FamilyOtherBlues",
	"StdHW", "StdVW", "escape", "UniqueID", "XUID", "charset", "Encoding", "CharStrings", "Private", "Subrs",
	"defaultWidthX", "nominalWidthX"];

CFF.readDict = function (data, offset, end) {
	//const dict = [];
	const dict = {};
	let carr = [];

	while (offset < end) {
		const b0 = data[offset], b1 = data[offset + 1], b2 = data[offset + 2], b3 = data[offset + 3], b4 = data[offset + 4];
		let vs = 1;
		let key = null, val = null;
		// operand
		if (b0 == 28) { val = bin.readShort(data, offset + 1); vs = 3; }
		if (b0 == 29) { val = bin.readInt(data, offset + 1); vs = 5; }
		if (32 <= b0 && b0 <= 246) { val = b0 - 139; vs = 1; }
		if (247 <= b0 && b0 <= 250) { val = (b0 - 247) * 256 + b1 + 108; vs = 2; }
		if (251 <= b0 && b0 <= 254) { val = -(b0 - 251) * 256 - b1 - 108; vs = 2; }
		if (b0 == 255) { val = bin.readInt(data, offset + 1) / 0xffff; vs = 5; throw "unknown number"; }

		if (b0 == 30) {
			const nibs = [];
			vs = 1;
			/* eslint-disable no-constant-condition */
			while (true) {
				const b = data[offset + vs]; vs++;
				const nib0 = b >> 4, nib1 = b & 0xf;
				if (nib0 != 0xf) nibs.push(nib0); if (nib1 != 0xf) nibs.push(nib1);
				if (nib1 == 0xf) break;
			}
			/* eslint-enable no-constant-condition */
			let s = "";
			const chars = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, ".", "e", "e-", "reserved", "-", "endOfNumber"];
			const nibsLength = nibs.length;
			for (let i = 0; i < nibsLength; i++) s += chars[nibs[i]];
			val = parseFloat(s);
		}

		if (b0 <= 21)	// operator
		{
			key = keys[b0]; vs = 1;
			if (b0 == 12) {
				const keys = ["Copyright", "isFixedPitch", "ItalicAngle", "UnderlinePosition", "UnderlineThickness", "PaintType", "CharstringType", "FontMatrix", "StrokeWidth", "BlueScale",
					"BlueShift", "BlueFuzz", "StemSnapH", "StemSnapV", "ForceBold", 0, 0, "LanguageGroup", "ExpansionFactor", "initialRandomSeed",
					"SyntheticBase", "PostScript", "BaseFontName", "BaseFontBlend", 0, 0, 0, 0, 0, 0,
					"ROS", "CIDFontVersion", "CIDFontRevision", "CIDFontType", "CIDCount", "UIDBase", "FDArray", "FDSelect", "FontName"];
				key = keys[b1]; vs = 2;
			}
		}

		if (key != null) { dict[key] = carr.length == 1 ? carr[0] : carr; carr = []; }
		else carr.push(val);

		offset += vs;
	}
	return dict;
}

export default CFF;