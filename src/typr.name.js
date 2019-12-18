import bin from './typr.bin';

/* eslint-disable no-unused-vars */

const name = {};

name.parse = function (data, offset, length) {
	const obj = {};
	const format = bin.readUshort(data, offset); offset += 2;
	const count = bin.readUshort(data, offset); offset += 2;
	const stringOffset = bin.readUshort(data, offset); offset += 2;

	const names = [
		"copyright",
		"fontFamily",
		"fontSubfamily",
		"ID",
		"fullName",
		"version",
		"postScriptName",
		"trademark",
		"manufacturer",
		"designer",
		"description",
		"urlVendor",
		"urlDesigner",
		"licence",
		"licenceURL",
		"---",
		"typoFamilyName",
		"typoSubfamilyName",
		"compatibleFull",
		"sampleText",
		"postScriptCID",
		"wwsFamilyName",
		"wwsSubfamilyName",
		"lightPalette",
		"darkPalette"
	];

	const offset0 = offset;

	for (let i = 0; i < count; i++) {
		const platformID = bin.readUshort(data, offset); offset += 2;
		const encodingID = bin.readUshort(data, offset); offset += 2;
		const languageID = bin.readUshort(data, offset); offset += 2;
		const nameID = bin.readUshort(data, offset); offset += 2;
		const slen = bin.readUshort(data, offset); offset += 2;
		const noffset = bin.readUshort(data, offset); offset += 2;

		const cname = names[nameID];
		const soff = offset0 + count * 12 + noffset;
		let str;
		if (platformID == 0) str = bin.readUnicode(data, soff, slen / 2);
		else if (platformID == 3 && encodingID == 0) str = bin.readUnicode(data, soff, slen / 2);
		else if (encodingID == 0) str = bin.readASCII(data, soff, slen);
		else if (encodingID == 1) str = bin.readUnicode(data, soff, slen / 2);
		else if (encodingID == 3) str = bin.readUnicode(data, soff, slen / 2);

		else if (platformID == 1) { str = bin.readASCII(data, soff, slen); console.log("reading unknown MAC encoding " + encodingID + " as ASCII") }
		else throw "unknown encoding " + encodingID + ", platformID: " + platformID;

		const tid = "p" + platformID + "," + (languageID).toString(16);//Typr._platforms[platformID];
		if (obj[tid] == null) obj[tid] = {};
		obj[tid][cname] = str;
		obj[tid]._lang = languageID;
	}
	/*if(format == 1)
	{
		const langTagCount = bin.readUshort(data, offset);  offset += 2;
		for(let i=0; i<langTagCount; i++)
		{
			const length  = bin.readUshort(data, offset);  offset += 2;
			const noffset = bin.readUshort(data, offset);  offset += 2;
		}
	}*/

	for (let p in obj) if (obj[p].postScriptName != null && obj[p]._lang == 0x0409) return obj[p];		// United States
	for (let p in obj) if (obj[p].postScriptName != null && obj[p]._lang == 0x0000) return obj[p];		// Universal
	for (let p in obj) if (obj[p].postScriptName != null && obj[p]._lang == 0x0c0c) return obj[p];		// Canada
	for (let p in obj) if (obj[p].postScriptName != null) return obj[p];

	let tname;
	for (let p in obj) { tname = p; break; }

	return obj[tname];
}

export default name;