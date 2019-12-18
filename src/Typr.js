import bin from './typr.bin';

import CFF from './typr.cff';
import lctf from './typr.lctf';
import cmap from './typr.cmap';
import glyf from './typr.glyf';
import GPOS from './typr.gpos';
import GSUB from './typr.gsub';
import head from './typr.head';
import hhea from './typr.hhea';
import hmtx from './typr.hmtx';
import kern from './typr.kern';
import loca from './typr.loca';
import maxp from './typr.maxp';
import name from './typr.name';
import post from './typr.post';

import os2 from './typr.os2';
import SVG from './typr.svg';
import utils from './typr.util';

const Typr = {};

Typr.CFF = CFF;
Typr.lctf = lctf;
Typr.cmap = cmap;
Typr.glyf = glyf;
Typr.GPOS = GPOS;
Typr.GSUB = GSUB;
Typr.head = head;
Typr.hhea = hhea;
Typr.hmtx = hmtx;
Typr.kern = kern;
Typr.loca = loca;
Typr.maxp = maxp;
Typr.name = name;
Typr.post = post;

Typr["OS/2"] = os2;
Typr.SVG = SVG;

Typr.U = utils;

/* eslint-disable no-unused-vars */

Typr.parse = function(buff)
{
	const data = new Uint8Array(buff);

	const tag = bin.readASCII(data, 0, 4);
	if(tag=="ttcf") {
		let offset = 4;
		const majV = bin.readUshort(data, offset);  offset+=2;
		const minV = bin.readUshort(data, offset);  offset+=2;
		const numF = bin.readUint  (data, offset);  offset+=4;
		const fnts = [];
		for(let i=0; i<numF; i++) {
			const foff = bin.readUint  (data, offset);  offset+=4;
			fnts.push(Typr._readFont(data, foff));
		}
		return fnts;
	}
	else return [Typr._readFont(data, 0)];
}

Typr._readFont = function(data, offset) {
	const ooff = offset;

	const sfnt_version = bin.readFixed(data, offset);
	offset += 4;
	const numTables = bin.readUshort(data, offset);
	offset += 2;
	const searchRange = bin.readUshort(data, offset);
	offset += 2;
	const entrySelector = bin.readUshort(data, offset);
	offset += 2;
	const rangeShift = bin.readUshort(data, offset);
	offset += 2;

	const tags = [
		"cmap",
		"head",
		"hhea",
		"maxp",
		"hmtx",
		"name",
		"OS/2",
		"post",

		//"cvt",
		//"fpgm",
		"loca",
		"glyf",
		"kern",

		//"prep"
		//"gasp"

		"CFF ",

		"GPOS",
		"GSUB",

		"SVG "

		//"VORG",
	];

	const obj = {_data:data, _offset:ooff};

	const tabs = {};

	for(let i=0; i<numTables; i++)
	{
		const tag = bin.readASCII(data, offset, 4);   offset += 4;
		const checkSum = bin.readUint(data, offset);  offset += 4;
		const toffset = bin.readUint(data, offset);   offset += 4;
		const length = bin.readUint(data, offset);    offset += 4;
		tabs[tag] = {offset:toffset, length:length};
	}

	const tagsLength = tags.length;
	for(let i=0; i< tagsLength; i++)
	{
		const t = tags[i];
		if(tabs[t]) obj[t.trim()] = Typr[t.trim()].parse(data, tabs[t].offset, tabs[t].length, obj);
	}

	return obj;
}

Typr._tabOffset = function(data, tab, foff)
{
	const numTables = bin.readUshort(data, foff+4);
	let offset = foff+12;
	for(let i=0; i<numTables; i++)
	{
		const tag = bin.readASCII(data, offset, 4);   offset += 4;
		const checkSum = bin.readUint(data, offset);  offset += 4;
		const toffset = bin.readUint(data, offset);   offset += 4;
		const length = bin.readUint(data, offset);    offset += 4;
		if(tag==tab) return toffset;
	}
	return 0;
}

export default Typr;