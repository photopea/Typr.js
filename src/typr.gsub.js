import bin from './typr.bin';
import lctf from './typr.lctf';

const GSUB = {};

GSUB.parse = function (data, offset, length, font) { return lctf.parse(data, offset, length, font, GSUB.subt); }


GSUB.subt = function (data, ltype, offset)	// lookup type
{
	const offset0 = offset, tab = {};

	tab.fmt = bin.readUshort(data, offset); offset += 2;

	if (ltype != 1 && ltype != 4 && ltype != 5 && ltype != 6) return null;

	if (ltype == 1 || ltype == 4 || (ltype == 5 && tab.fmt <= 2) || (ltype == 6 && tab.fmt <= 2)) {
		const covOff = bin.readUshort(data, offset); offset += 2;
		tab.coverage = lctf.readCoverage(data, offset0 + covOff);	// not always is coverage here
	}

	//  Single Substitution Subtable
	if (ltype == 1) {
		if (tab.fmt == 1) {
			tab.delta = bin.readShort(data, offset); offset += 2;
		}
		else if (tab.fmt == 2) {
			const cnt = bin.readUshort(data, offset); offset += 2;
			tab.newg = bin.readUshorts(data, offset, cnt); offset += tab.newg.length * 2;
		}
	}
	//  Ligature Substitution Subtable
	else if (ltype == 4) {
		tab.vals = [];
		const cnt = bin.readUshort(data, offset); offset += 2;
		for (let i = 0; i < cnt; i++) {
			const loff = bin.readUshort(data, offset); offset += 2;
			tab.vals.push(GSUB.readLigatureSet(data, offset0 + loff));
		}
	}
	//  Contextual Substitution Subtable
	else if (ltype == 5) {
		if (tab.fmt == 2) {
			const cDefOffset = bin.readUshort(data, offset); offset += 2;
			tab.cDef = lctf.readClassDef(data, offset0 + cDefOffset);
			tab.scset = [];
			const subClassSetCount = bin.readUshort(data, offset); offset += 2;
			for (let i = 0; i < subClassSetCount; i++) {
				const scsOff = bin.readUshort(data, offset); offset += 2;
				tab.scset.push(scsOff == 0 ? null : GSUB.readSubClassSet(data, offset0 + scsOff));
			}
		}
	}
	//*
	else if (ltype == 6) {
		/*
		if(tab.fmt==2) {
			const btDef = bin.readUshort(data, offset);  offset+=2;
			const inDef = bin.readUshort(data, offset);  offset+=2;
			const laDef = bin.readUshort(data, offset);  offset+=2;

			tab.btDef = lctf.readClassDef(data, offset0 + btDef);
			tab.inDef = lctf.readClassDef(data, offset0 + inDef);
			tab.laDef = lctf.readClassDef(data, offset0 + laDef);

			tab.scset = [];
			const cnt = bin.readUshort(data, offset);  offset+=2;
			for(let i=0; i<cnt; i++) {
				const loff = bin.readUshort(data, offset);  offset+=2;
				tab.scset.push(GSUB.readChainSubClassSet(data, offset0+loff));
			}
		}
		*/
		if (tab.fmt == 3) {
			for (let i = 0; i < 3; i++) {
				const cnt = bin.readUshort(data, offset); offset += 2;
				const cvgs = [];
				for (let j = 0; j < cnt; j++) cvgs.push(lctf.readCoverage(data, offset0 + bin.readUshort(data, offset + j * 2)));
				offset += cnt * 2;
				if (i == 0) tab.backCvg = cvgs;
				if (i == 1) tab.inptCvg = cvgs;
				if (i == 2) tab.ahedCvg = cvgs;
			}
			const cnt = bin.readUshort(data, offset); offset += 2;
			tab.lookupRec = GSUB.readSubstLookupRecords(data, offset, cnt);
		}
	}

	return tab;
}

GSUB.readSubClassSet = function (data, offset) {
	const rUs = bin.readUshort, offset0 = offset, lset = [];
	const cnt = rUs(data, offset); offset += 2;
	for (let i = 0; i < cnt; i++) {
		const loff = rUs(data, offset); offset += 2;
		lset.push(GSUB.readSubClassRule(data, offset0 + loff));
	}
	return lset;
}
GSUB.readSubClassRule = function (data, offset) {
	const rUs = bin.readUshort, rule = {};
	const gcount = rUs(data, offset); offset += 2;
	const scount = rUs(data, offset); offset += 2;
	rule.input = [];
	for (let i = 0; i < gcount - 1; i++) {
		rule.input.push(rUs(data, offset)); offset += 2;
	}
	rule.substLookupRecords = GSUB.readSubstLookupRecords(data, offset, scount);
	return rule;
}
GSUB.readSubstLookupRecords = function (data, offset, cnt) {
	const rUs = bin.readUshort;
	const out = [];
	for (let i = 0; i < cnt; i++) { out.push(rUs(data, offset), rUs(data, offset + 2)); offset += 4; }
	return out;
}

GSUB.readChainSubClassSet = function (data, offset) {
	const offset0 = offset, lset = [];
	const cnt = bin.readUshort(data, offset); offset += 2;
	for (let i = 0; i < cnt; i++) {
		const loff = bin.readUshort(data, offset); offset += 2;
		lset.push(GSUB.readChainSubClassRule(data, offset0 + loff));
	}
	return lset;
}
GSUB.readChainSubClassRule = function (data, offset) {
	const rule = {};
	const pps = ["backtrack", "input", "lookahead"];
	const ppsLength = pps.length
	for (let pi = 0; pi < ppsLength; pi++) {
		let cnt = bin.readUshort(data, offset); offset += 2; if (pi == 1) cnt--;
		rule[pps[pi]] = bin.readUshorts(data, offset, cnt); offset += rule[pps[pi]].length * 2;
	}
	const cnt = bin.readUshort(data, offset); offset += 2;
	rule.subst = bin.readUshorts(data, offset, cnt * 2); offset += rule.subst.length * 2;
	return rule;
}

GSUB.readLigatureSet = function (data, offset) {
	const offset0 = offset, lset = [];
	const lcnt = bin.readUshort(data, offset); offset += 2;
	for (let j = 0; j < lcnt; j++) {
		const loff = bin.readUshort(data, offset); offset += 2;
		lset.push(GSUB.readLigature(data, offset0 + loff));
	}
	return lset;
}
GSUB.readLigature = function (data, offset) {
	const lig = { chain: [] };
	lig.nglyph = bin.readUshort(data, offset); offset += 2;
	const ccnt = bin.readUshort(data, offset); offset += 2;
	for (let k = 0; k < ccnt - 1; k++) { lig.chain.push(bin.readUshort(data, offset)); offset += 2; }
	return lig;
}

export default GSUB;