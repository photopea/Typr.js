import bin from './typr.bin';

/* eslint-disable no-unused-vars */

// OpenType Layout Common Table Formats

const lctf = {};

lctf.parse = function (data, offset, length, font, subt) {
	const obj = {};
	const offset0 = offset;
	const tableVersion = bin.readFixed(data, offset); offset += 4;

	const offScriptList = bin.readUshort(data, offset); offset += 2;
	const offFeatureList = bin.readUshort(data, offset); offset += 2;
	const offLookupList = bin.readUshort(data, offset); offset += 2;


	obj.scriptList = lctf.readScriptList(data, offset0 + offScriptList);
	obj.featureList = lctf.readFeatureList(data, offset0 + offFeatureList);
	obj.lookupList = lctf.readLookupList(data, offset0 + offLookupList, subt);

	return obj;
}

lctf.readLookupList = function (data, offset, subt) {
	const offset0 = offset;
	const obj = [];
	const count = bin.readUshort(data, offset); offset += 2;
	for (let i = 0; i < count; i++) {
		const noff = bin.readUshort(data, offset); offset += 2;
		const lut = lctf.readLookupTable(data, offset0 + noff, subt);
		obj.push(lut);
	}
	return obj;
}

lctf.readLookupTable = function (data, offset, subt) {
	const offset0 = offset;
	const obj = { tabs: [] };

	obj.ltype = bin.readUshort(data, offset); offset += 2;
	obj.flag = bin.readUshort(data, offset); offset += 2;
	const cnt = bin.readUshort(data, offset); offset += 2;

	for (let i = 0; i < cnt; i++) {
		const noff = bin.readUshort(data, offset); offset += 2;
		const tab = subt(data, obj.ltype, offset0 + noff);
		obj.tabs.push(tab);
	}
	return obj;
}

lctf.numOfOnes = function (n) {
	let num = 0;
	for (let i = 0; i < 32; i++) if (((n >>> i) & 1) != 0) num++;
	return num;
}

lctf.readClassDef = function (data, offset) {
	const obj = [];
	const format = bin.readUshort(data, offset); offset += 2;
	if (format == 1) {
		const startGlyph = bin.readUshort(data, offset); offset += 2;
		const glyphCount = bin.readUshort(data, offset); offset += 2;
		for (let i = 0; i < glyphCount; i++) {
			obj.push(startGlyph + i);
			obj.push(startGlyph + i);
			obj.push(bin.readUshort(data, offset)); offset += 2;
		}
	}
	if (format == 2) {
		const count = bin.readUshort(data, offset); offset += 2;
		for (let i = 0; i < count; i++) {
			obj.push(bin.readUshort(data, offset)); offset += 2;
			obj.push(bin.readUshort(data, offset)); offset += 2;
			obj.push(bin.readUshort(data, offset)); offset += 2;
		}
	}
	return obj;
}
lctf.getInterval = function (tab, val) {
	const tabLength = tab.length;
	for (let i = 0; i < tabLength; i += 3) {
		const start = tab[i], end = tab[i + 1], index = tab[i + 2];
		if (start <= val && val <= end) return i;
	}
	return -1;
}


lctf.readCoverage = function (data, offset) {
	const cvg = {};
	cvg.fmt = bin.readUshort(data, offset); offset += 2;
	const count = bin.readUshort(data, offset); offset += 2;
	if (cvg.fmt == 1) cvg.tab = bin.readUshorts(data, offset, count);
	if (cvg.fmt == 2) cvg.tab = bin.readUshorts(data, offset, count * 3);
	return cvg;
}

lctf.coverageIndex = function (cvg, val) {
	const tab = cvg.tab;
	if (cvg.fmt == 1) return tab.indexOf(val);
	if (cvg.fmt == 2) {
		const ind = lctf.getInterval(tab, val);
		if (ind != -1) return tab[ind + 2] + (val - tab[ind]);
	}
	return -1;
}

lctf.readFeatureList = function (data, offset) {
	const offset0 = offset;
	const obj = [];

	const count = bin.readUshort(data, offset); offset += 2;

	for (let i = 0; i < count; i++) {
		const tag = bin.readASCII(data, offset, 4); offset += 4;
		const noff = bin.readUshort(data, offset); offset += 2;
		obj.push({ tag: tag.trim(), tab: lctf.readFeatureTable(data, offset0 + noff) });
	}
	return obj;
}

lctf.readFeatureTable = function (data, offset) {
	const featureParams = bin.readUshort(data, offset); offset += 2;	// = 0
	const lookupCount = bin.readUshort(data, offset); offset += 2;

	const indices = [];
	for (let i = 0; i < lookupCount; i++) indices.push(bin.readUshort(data, offset + 2 * i));
	return indices;
}


lctf.readScriptList = function (data, offset) {
	const offset0 = offset;
	const obj = {};

	const count = bin.readUshort(data, offset); offset += 2;

	for (let i = 0; i < count; i++) {
		const tag = bin.readASCII(data, offset, 4); offset += 4;
		const noff = bin.readUshort(data, offset); offset += 2;
		obj[tag.trim()] = lctf.readScriptTable(data, offset0 + noff);
	}
	return obj;
}

lctf.readScriptTable = function (data, offset) {
	const offset0 = offset;
	const obj = {};

	const defLangSysOff = bin.readUshort(data, offset); offset += 2;
	obj.default = lctf.readLangSysTable(data, offset0 + defLangSysOff);

	const langSysCount = bin.readUshort(data, offset); offset += 2;

	for (let i = 0; i < langSysCount; i++) {
		const tag = bin.readASCII(data, offset, 4); offset += 4;
		const langSysOff = bin.readUshort(data, offset); offset += 2;
		obj[tag.trim()] = lctf.readLangSysTable(data, offset0 + langSysOff);
	}
	return obj;
}

lctf.readLangSysTable = function (data, offset) {
	const obj = {};

	const lookupOrder = bin.readUshort(data, offset); offset += 2;
	//if(lookupOrder!=0)  throw "lookupOrder not 0";
	obj.reqFeature = bin.readUshort(data, offset); offset += 2;
	//if(obj.reqFeature != 0xffff) throw "reqFeatureIndex != 0xffff";

	const featureCount = bin.readUshort(data, offset); offset += 2;
	obj.features = bin.readUshorts(data, offset, featureCount);
	return obj;
}

export default lctf;