import bin from './typr.bin';
import lctf from './typr.lctf';

const GPOS = {};

GPOS.parse = function (data, offset, length, font) { return lctf.parse(data, offset, length, font, GPOS.subt); }


GPOS.subt = function (data, ltype, offset)	// lookup type
{
	const offset0 = offset, tab = {};

	tab.fmt = bin.readUshort(data, offset); offset += 2;

	if (ltype == 1 || ltype == 2 || ltype == 3 || ltype == 7 || (ltype == 8 && tab.fmt <= 2)) {
		const covOff = bin.readUshort(data, offset); offset += 2;
		tab.coverage = lctf.readCoverage(data, covOff + offset0);
	}
	if (ltype == 1 && tab.fmt == 1) {
		const valFmt1 = bin.readUshort(data, offset); offset += 2;
		if (valFmt1 != 0) tab.pos = GPOS.readValueRecord(data, offset, valFmt1);
	}
	else if (ltype == 2) {
		const valFmt1 = bin.readUshort(data, offset); offset += 2;
		const valFmt2 = bin.readUshort(data, offset); offset += 2;
		const ones1 = lctf.numOfOnes(valFmt1);
		const ones2 = lctf.numOfOnes(valFmt2);
		if (tab.fmt == 1) {
			tab.pairsets = [];
			const psc = bin.readUshort(data, offset); offset += 2;  // PairSetCount

			for (let i = 0; i < psc; i++) {
				let psoff = offset0 + bin.readUshort(data, offset); offset += 2;

				const pvc = bin.readUshort(data, psoff); psoff += 2;
				const arr = [];
				for (let j = 0; j < pvc; j++) {
					const gid2 = bin.readUshort(data, psoff); psoff += 2;
					let value1, value2;
					if (valFmt1 != 0) { value1 = GPOS.readValueRecord(data, psoff, valFmt1); psoff += ones1 * 2; }
					if (valFmt2 != 0) { value2 = GPOS.readValueRecord(data, psoff, valFmt2); psoff += ones2 * 2; }
					//if(value1!=null) throw "e";
					arr.push({ gid2: gid2, val1: value1, val2: value2 });
				}
				tab.pairsets.push(arr);
			}
		}
		if (tab.fmt == 2) {
			const classDef1 = bin.readUshort(data, offset); offset += 2;
			const classDef2 = bin.readUshort(data, offset); offset += 2;
			const class1Count = bin.readUshort(data, offset); offset += 2;
			const class2Count = bin.readUshort(data, offset); offset += 2;

			tab.classDef1 = lctf.readClassDef(data, offset0 + classDef1);
			tab.classDef2 = lctf.readClassDef(data, offset0 + classDef2);

			tab.matrix = [];
			for (let i = 0; i < class1Count; i++) {
				const row = [];
				for (let j = 0; j < class2Count; j++) {
					let value1 = null, value2 = null;
					if (tab.valFmt1 != 0) { value1 = GPOS.readValueRecord(data, offset, tab.valFmt1); offset += ones1 * 2; }
					if (tab.valFmt2 != 0) { value2 = GPOS.readValueRecord(data, offset, tab.valFmt2); offset += ones2 * 2; }
					row.push({ val1: value1, val2: value2 });
				}
				tab.matrix.push(row);
			}
		}
	}
	return tab;
}


GPOS.readValueRecord = function (data, offset, valFmt) {
	const arr = [];
	arr.push((valFmt & 1) ? bin.readShort(data, offset) : 0); offset += (valFmt & 1) ? 2 : 0;  // X_PLACEMENT
	arr.push((valFmt & 2) ? bin.readShort(data, offset) : 0); offset += (valFmt & 2) ? 2 : 0;  // Y_PLACEMENT
	arr.push((valFmt & 4) ? bin.readShort(data, offset) : 0); offset += (valFmt & 4) ? 2 : 0;  // X_ADVANCE
	arr.push((valFmt & 8) ? bin.readShort(data, offset) : 0); offset += (valFmt & 8) ? 2 : 0;  // Y_ADVANCE
	return arr;
}

export default GPOS;