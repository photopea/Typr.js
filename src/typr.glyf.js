import bin from './typr.bin';
import Typr from './Typr';

/* eslint-disable no-unused-vars */

const glyf = {};

glyf.parse = function (data, offset, length, font) {
	const obj = [];
	for (let g = 0; g < font.maxp.numGlyphs; g++) obj.push(null);
	return obj;
}

glyf._parseGlyf = function (font, g) {
	const data = font._data;

	let offset = Typr._tabOffset(data, "glyf", font._offset) + font.loca[g];

	if (font.loca[g] == font.loca[g + 1]) return null;

	const gl = {};

	gl.noc = bin.readShort(data, offset); offset += 2;		// number of contours
	gl.xMin = bin.readShort(data, offset); offset += 2;
	gl.yMin = bin.readShort(data, offset); offset += 2;
	gl.xMax = bin.readShort(data, offset); offset += 2;
	gl.yMax = bin.readShort(data, offset); offset += 2;

	if (gl.xMin >= gl.xMax || gl.yMin >= gl.yMax) return null;

	if (gl.noc > 0) {
		gl.endPts = [];
		for (let i = 0; i < gl.noc; i++) { gl.endPts.push(bin.readUshort(data, offset)); offset += 2; }

		const instructionLength = bin.readUshort(data, offset); offset += 2;
		if ((data.length - offset) < instructionLength) return null;
		gl.instructions = bin.readBytes(data, offset, instructionLength); offset += instructionLength;

		const crdnum = gl.endPts[gl.noc - 1] + 1;
		gl.flags = [];
		for (let i = 0; i < crdnum; i++) {
			const flag = data[offset]; offset++;
			gl.flags.push(flag);
			if ((flag & 8) != 0) {
				const rep = data[offset]; offset++;
				for (let j = 0; j < rep; j++) { gl.flags.push(flag); i++; }
			}
		}
		gl.xs = [];
		for (let i = 0; i < crdnum; i++) {
			const i8 = ((gl.flags[i] & 2) != 0), same = ((gl.flags[i] & 16) != 0);
			if (i8) { gl.xs.push(same ? data[offset] : -data[offset]); offset++; }
			else {
				if (same) gl.xs.push(0);
				else { gl.xs.push(bin.readShort(data, offset)); offset += 2; }
			}
		}
		gl.ys = [];
		for (let i = 0; i < crdnum; i++) {
			const i8 = ((gl.flags[i] & 4) != 0), same = ((gl.flags[i] & 32) != 0);
			if (i8) { gl.ys.push(same ? data[offset] : -data[offset]); offset++; }
			else {
				if (same) gl.ys.push(0);
				else { gl.ys.push(bin.readShort(data, offset)); offset += 2; }
			}
		}
		let x = 0, y = 0;
		for (let i = 0; i < crdnum; i++) { x += gl.xs[i]; y += gl.ys[i]; gl.xs[i] = x; gl.ys[i] = y; }
	}
	else {
		const ARG_1_AND_2_ARE_WORDS = 1 << 0;
		const ARGS_ARE_XY_VALUES = 1 << 1;
		const ROUND_XY_TO_GRID = 1 << 2;
		const WE_HAVE_A_SCALE = 1 << 3;
		const RESERVED = 1 << 4;
		const MORE_COMPONENTS = 1 << 5;
		const WE_HAVE_AN_X_AND_Y_SCALE = 1 << 6;
		const WE_HAVE_A_TWO_BY_TWO = 1 << 7;
		const WE_HAVE_INSTRUCTIONS = 1 << 8;
		const USE_MY_METRICS = 1 << 9;
		const OVERLAP_COMPOUND = 1 << 10;
		const SCALED_COMPONENT_OFFSET = 1 << 11;
		const UNSCALED_COMPONENT_OFFSET = 1 << 12;

		gl.parts = [];
		let flags;
		do {
			flags = bin.readUshort(data, offset); offset += 2;
			const part = { m: { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 }, p1: -1, p2: -1 }; gl.parts.push(part);
			part.glyphIndex = bin.readUshort(data, offset); offset += 2;
			let arg1, arg2;
			if (flags & ARG_1_AND_2_ARE_WORDS) {
				arg1 = bin.readShort(data, offset); offset += 2;
				arg2 = bin.readShort(data, offset); offset += 2;
			} else {
				arg1 = bin.readInt8(data, offset); offset++;
				arg2 = bin.readInt8(data, offset); offset++;
			}

			if (flags & ARGS_ARE_XY_VALUES) { part.m.tx = arg1; part.m.ty = arg2; }
			else { part.p1 = arg1; part.p2 = arg2; }
			//part.m.tx = arg1;  part.m.ty = arg2;
			//else { throw "params are not XY values"; }

			if (flags & WE_HAVE_A_SCALE) {
				part.m.a = part.m.d = bin.readF2dot14(data, offset); offset += 2;
			} else if (flags & WE_HAVE_AN_X_AND_Y_SCALE) {
				part.m.a = bin.readF2dot14(data, offset); offset += 2;
				part.m.d = bin.readF2dot14(data, offset); offset += 2;
			} else if (flags & WE_HAVE_A_TWO_BY_TWO) {
				part.m.a = bin.readF2dot14(data, offset); offset += 2;
				part.m.b = bin.readF2dot14(data, offset); offset += 2;
				part.m.c = bin.readF2dot14(data, offset); offset += 2;
				part.m.d = bin.readF2dot14(data, offset); offset += 2;
			}
		} while (flags & MORE_COMPONENTS)
		if (flags & WE_HAVE_INSTRUCTIONS) {
			const numInstr = bin.readUshort(data, offset); offset += 2;
			gl.instr = [];
			for (let i = 0; i < numInstr; i++) { gl.instr.push(data[offset]); offset++; }
		}
	}
	return gl;
}

export default glyf;