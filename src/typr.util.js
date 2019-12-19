import SVG from './typr.svg';
import glyf from './typr.glyf';
import lctf from './typr.lctf';
import CFF from './typr.cff';

const utils = {};

utils.codeToGlyph = function (font, code) {
	const cmap = font.cmap;

	let tind = -1;
	if (cmap.p0e4 != null) tind = cmap.p0e4;
	else if (cmap.p3e1 != null) tind = cmap.p3e1;
	else if (cmap.p1e0 != null) tind = cmap.p1e0;
	else if (cmap.p0e3 != null) tind = cmap.p0e3;

	if (tind == -1) throw "no familiar platform and encoding!";

	const tab = cmap.tables[tind];

	if (tab.format == 0) {
		if (code >= tab.map.length) return 0;
		return tab.map[code];
	}
	else if (tab.format == 4) {
		let sind = -1;
		const tabEndCountLength = tab.endCount.length;
		for (let i = 0; i < tabEndCountLength; i++)   if (code <= tab.endCount[i]) { sind = i; break; }
		if (sind == -1) return 0;
		if (tab.startCount[sind] > code) return 0;

		let gli = 0;
		if (tab.idRangeOffset[sind] != 0) gli = tab.glyphIdArray[(code - tab.startCount[sind]) + (tab.idRangeOffset[sind] >> 1) - (tab.idRangeOffset.length - sind)];
		else gli = code + tab.idDelta[sind];
		return gli & 0xFFFF;
	}
	else if (tab.format == 12) {
		const tabGroupsLength = tab.groups.length
		if (code > tab.groups[tabGroupsLength - 1][1]) return 0;
		for (let i = 0; i < tabGroupsLength; i++) {
			const grp = tab.groups[i];
			if (grp[0] <= code && code <= grp[1]) return grp[2] + (code - grp[0]);
		}
		return 0;
	}
	else throw "unknown cmap table format " + tab.format;
}


utils.glyphToPath = function (font, gid) {
	const path = { cmds: [], crds: [] };
	if (font.SVG && font.SVG.entries[gid]) {
		let p = font.SVG.entries[gid]; if (p == null) return path;
		if (typeof p == "string") { p = SVG.toPath(p); font.SVG.entries[gid] = p; }
		return p;
	}
	else if (font.CFF) {
		const state = { x: 0, y: 0, stack: [], nStems: 0, haveWidth: false, width: font.CFF.Private ? font.CFF.Private.defaultWidthX : 0, open: false };
		const cff = font.CFF;
		let pdct = font.CFF.Private;
		if (cff.ROS) {
			let gi = 0;
			while (cff.FDSelect[gi + 2] <= gid) gi += 2;
			pdct = cff.FDArray[cff.FDSelect[gi + 1]].Private;
		}
		utils._drawCFF(font.CFF.CharStrings[gid], state, cff, pdct, path);
	}
	else if (font.glyf) { utils._drawGlyf(gid, font, path); }
	return path;
}

utils._drawGlyf = function (gid, font, path) {
	let gl = font.glyf[gid];
	if (gl == null) gl = font.glyf[gid] = glyf._parseGlyf(font, gid);
	if (gl != null) {
		if (gl.noc > -1) utils._simpleGlyph(gl, path);
		else utils._compoGlyph(gl, font, path);
	}
}
utils._simpleGlyph = function (gl, p) {
	for (let c = 0; c < gl.noc; c++) {
		const i0 = (c == 0) ? 0 : (gl.endPts[c - 1] + 1);
		const il = gl.endPts[c];

		for (let i = i0; i <= il; i++) {
			const pr = (i == i0) ? il : (i - 1);
			const nx = (i == il) ? i0 : (i + 1);
			const onCurve = gl.flags[i] & 1;
			const prOnCurve = gl.flags[pr] & 1;
			const nxOnCurve = gl.flags[nx] & 1;

			const x = gl.xs[i], y = gl.ys[i];

			if (i == i0) {
				if (onCurve) {
					if (prOnCurve) utils.P.moveTo(p, gl.xs[pr], gl.ys[pr]);
					else { utils.P.moveTo(p, x, y); continue;  /*  will do curveTo at il  */ }
				}
				else {
					if (prOnCurve) utils.P.moveTo(p, gl.xs[pr], gl.ys[pr]);
					else utils.P.moveTo(p, (gl.xs[pr] + x) / 2, (gl.ys[pr] + y) / 2);
				}
			}
			if (onCurve) {
				if (prOnCurve) utils.P.lineTo(p, x, y);
			}
			else {
				if (nxOnCurve) utils.P.qcurveTo(p, x, y, gl.xs[nx], gl.ys[nx]);
				else utils.P.qcurveTo(p, x, y, (x + gl.xs[nx]) / 2, (y + gl.ys[nx]) / 2);
			}
		}
		utils.P.closePath(p);
	}
}
utils._compoGlyph = function (gl, font, p) {
	const glPartsLength = gl.parts.length
	for (let j = 0; j < glPartsLength; j++) {
		const path = { cmds: [], crds: [] };
		const prt = gl.parts[j];
		utils._drawGlyf(prt.glyphIndex, font, path);

		const m = prt.m;
		const pathCrdsLength = path.crds.length
		for (let i = 0; i < pathCrdsLength; i += 2) {
			const x = path.crds[i], y = path.crds[i + 1];
			p.crds.push(x * m.a + y * m.b + m.tx);
			p.crds.push(x * m.c + y * m.d + m.ty);
		}
		const pathCmdsLength = path.cmds.length
		for (let i = 0; i < pathCmdsLength; i++) p.cmds.push(path.cmds[i]);
	}
}


utils._getGlyphClass = function (g, cd) {
	const intr = lctf.getInterval(cd, g);
	return intr == -1 ? 0 : cd[intr + 2];
	//const cdStartLength = cd.start.length;
	//for(let i=0; i<cdStartLength; i++)
	//	if(cd.start[i]<=g && cd.end[i]>=g) return cd.class[i];
	//return 0;
}

utils.getPairAdjustment = function (font, g1, g2) {
	//return 0;
	if (font.GPOS) {
		const gpos = font["GPOS"];
		const llist = gpos.lookupList, flist = gpos.featureList;
		const tused = [];
		const flistLength = flist.length;
		for (let i = 0; i < flistLength; i++) {
			const fl = flist[i];
			if (fl.tag != "kern") continue;
			const flTabLength = fl.tab.length;
			for (let ti = 0; ti < flTabLength; ti++) {
				const flTab = fl.tab[ti];
				if (tused[flTab]) continue; tused[flTab] = true;
				const tab = llist[flTab];

				const tabTabsLength = tab.tabs.length
				for (let j = 0; j < tabTabsLength; j++) {
					if (tab.tabs[i] == null) continue;
					const ltab = tab.tabs[j];
					let ind;
					if (ltab.coverage) { ind = lctf.coverageIndex(ltab.coverage, g1); if (ind == -1) continue; }

					if (tab.ltype == 2) {
						let adj;
						if (ltab.fmt == 1) {
							const right = ltab.pairsets[ind];
							const rightLength = right.length
							for (let i = 0; i < rightLength; i++) if (right[i].gid2 == g2) adj = right[i];
						}
						else if (ltab.fmt == 2) {
							const c1 = utils._getGlyphClass(g1, ltab.classDef1);
							const c2 = utils._getGlyphClass(g2, ltab.classDef2);
							adj = ltab.matrix[c1][c2];
						}
						if (adj && adj.val2) return adj.val2[2];
					}
				}
			}
		}
	}
	if (font.kern) {
		const ind1 = font.kern.glyph1.indexOf(g1);
		if (ind1 != -1) {
			const ind2 = font.kern.rval[ind1].glyph2.indexOf(g2);
			if (ind2 != -1) return font.kern.rval[ind1].vals[ind2];
		}
	}

	return 0;
}

utils.stringToGlyphs = function (font, str) {
	const gls = [];
	const strLength = str.length;
	for (let i = 0; i < strLength; i++) {
		const cc = str.codePointAt(i);// if (cc > 0xffff) i++;
		gls.push(utils.codeToGlyph(font, cc));
	}
	for (let i = 0; i < strLength; i++) {
		const cc = str.codePointAt(i);  //
		if (cc == 2367) { const t = gls[i - 1]; gls[i - 1] = gls[i]; gls[i] = t; }
		//if(cc==2381) {  const t=gls[i+1];  gls[i+1]=gls[i];  gls[i]=t;  }
		if (cc > 0xffff) i++;
	}

	const gsub = font["GSUB"]; if (gsub == null) return gls;
	const llist = gsub.lookupList, flist = gsub.featureList;

	const cligs = ["rlig", "liga", "mset", "isol", "init", "fina", "medi", "half", "pres",
		"blws" /* Tibetan fonts like Himalaya.ttf */];

	const tused = [];
	const flistLength = flist.length;
	for (let fi = 0; fi < flistLength; fi++) {
		const fl = flist[fi]; if (cligs.indexOf(fl.tag) == -1) continue;
		//if(fl.tag=="blwf") continue;
		const flTabLength = fl.tab.length
		for (let ti = 0; ti < flTabLength; ti++) {
			if (tused[fl.tab[ti]]) continue; tused[fl.tab[ti]] = true;
			const tab = llist[fl.tab[ti]];
			const glsLength = gls.length
			for (let ci = 0; ci < glsLength; ci++) {
				const feat = utils._getWPfeature(str, ci);
				if ("isol,init,fina,medi".indexOf(fl.tag) != -1 && fl.tag != feat) continue;

				utils._applySubs(gls, ci, tab, llist);
			}
		}
	}

	return gls;
}
utils._getWPfeature = function (str, ci) {  // get Word Position feature
	const wsep = "\n\t\" ,.:;!?()  ،";
	const R = "آأؤإاةدذرزوٱٲٳٵٶٷڈډڊڋڌڍڎڏڐڑڒړڔڕږڗژڙۀۃۄۅۆۇۈۉۊۋۍۏےۓەۮۯܐܕܖܗܘܙܞܨܪܬܯݍݙݚݛݫݬݱݳݴݸݹࡀࡆࡇࡉࡔࡧࡩࡪࢪࢫࢬࢮࢱࢲࢹૅેૉ૊૎૏ૐ૑૒૝ૡ૤૯஁ஃ஄அஉ஌எஏ஑னப஫஬";
	const L = "ꡲ્૗";

	let slft = ci == 0 || wsep.indexOf(str[ci - 1]) != -1;
	let srgt = ci == str.length - 1 || wsep.indexOf(str[ci + 1]) != -1;

	if (!slft && R.indexOf(str[ci - 1]) != -1) slft = true;
	if (!srgt && R.indexOf(str[ci]) != -1) srgt = true;

	if (!srgt && L.indexOf(str[ci + 1]) != -1) srgt = true;
	if (!slft && L.indexOf(str[ci]) != -1) slft = true;

	let feat = null;
	if (slft) feat = srgt ? "isol" : "init";
	else feat = srgt ? "fina" : "medi";

	return feat;
}
utils._applySubs = function (gls, ci, tab, llist) {
	const rlim = gls.length - ci - 1;
	const tabTabsLength = tab.tabs.length;
	for (let j = 0; j < tabTabsLength; j++) {
		if (tab.tabs[j] == null) continue;
		const ltab = tab.tabs[j];
		let ind;
		if (ltab.coverage) { ind = lctf.coverageIndex(ltab.coverage, gls[ci]); if (ind == -1) continue; }
		if (tab.ltype == 1) {
			if (ltab.fmt == 1) gls[ci] = gls[ci] + ltab.delta;
			else gls[ci] = ltab.newg[ind];
		}
		else if (tab.ltype == 4) {
			const vals = ltab.vals[ind];
			const valsLength = vals.length;

			for (let k = 0; k < valsLength; k++) {
				const lig = vals[k], rl = lig.chain.length; if (rl > rlim) continue;
				let good = true, em1 = 0;
				for (let l = 0; l < rl; l++) { while (gls[ci + em1 + (1 + l)] == -1) em1++; if (lig.chain[l] != gls[ci + em1 + (1 + l)]) good = false; }
				if (!good) continue;
				gls[ci] = lig.nglyph;
				for (let l = 0; l < rl + em1; l++) gls[ci + l + 1] = -1; break;  // first character changed, other ligatures do not apply anymore
			}
		}
		else if (tab.ltype == 5 && ltab.fmt == 2) {
			const cind = lctf.getInterval(ltab.cDef, gls[ci]);
			const cls = ltab.cDef[cind + 2], scs = ltab.scset[cls];
			const scsLength = scs.length;
			for (let i = 0; i < scsLength; i++) {
				const sc = scs[i], inp = sc.input;
				if (inp.length > rlim) continue;
				let good = true;
				const inpLength = inp.length
				for (let l = 0; l < inpLength; l++) {
					const cind2 = lctf.getInterval(ltab.cDef, gls[ci + 1 + l]);
					if (cind == -1 && ltab.cDef[cind2 + 2] != inp[l]) { good = false; break; }
				}
				if (!good) continue;
				/*const lrs = sc.substLookupRecords;
				const lrsLength = lrs.length
				for (let k = 0; k < lrsLength; k += 2) {
					const gi = lrs[k], tabi = lrs[k + 1];
					//utils._applyType1(gls, ci+gi, llist[tabi]);
				}*/
			}
		}
		else if (tab.ltype == 6 && ltab.fmt == 3) {
			//if(ltab.backCvg.length==0) return;
			if (!utils._glsCovered(gls, ltab.backCvg, ci - ltab.backCvg.length)) continue;
			if (!utils._glsCovered(gls, ltab.inptCvg, ci)) continue;
			if (!utils._glsCovered(gls, ltab.ahedCvg, ci + ltab.inptCvg.length)) continue;
			const lr = ltab.lookupRec;
			const lrLength = lr.length
			for (let i = 0; i < lrLength; i += 2) {
				const cind = lr[i], tab2 = llist[lr[i + 1]];
				utils._applySubs(gls, ci + cind, tab2, llist);
			}
		}
	}
}

utils._glsCovered = function (gls, cvgs, ci) {
	const cvgsLength = cvgs.length;
	for (let i = 0; i < cvgsLength; i++) {
		const ind = lctf.coverageIndex(cvgs[i], gls[ci + i]); if (ind == -1) return false;
	}
	return true;
}

utils.glyphsToPath = function (font, gls, clr) {
	const tpath = { cmds: [], crds: [] };
	let x = 0;
	const length = gls.length;

	for (let i = 0; i < length; i++) {
		const gid = gls[i]; if (gid == -1) continue;
		const gid2 = (i < length - 1 && gls[i + 1] != -1) ? gls[i + 1] : 0;
		const path = utils.glyphToPath(font, gid);

		const coordLength = path.crds.length;
		for (let j = 0; j < coordLength; j += 2) {
			tpath.crds.push(path.crds[j] + x);
			tpath.crds.push(path.crds[j + 1]);
		}
		if (clr) tpath.cmds.push(clr);
		const pathCmdsLength = path.cmds.length
		for (let j = 0; j < pathCmdsLength; j++) tpath.cmds.push(path.cmds[j]);
		if (clr) tpath.cmds.push("X");
		x += font.hmtx.aWidth[gid];// - font.hmtx.lsBearing[gid];
		if (i < length - 1) x += utils.getPairAdjustment(font, gid, gid2);
	}
	return tpath;
}

utils.glyphToSvg = function(font, gid) {
	return utils.pathToSVG(utils.glyphToPath(font, gid));
}

utils.pathToSVG = function (path, prec) {
	if (prec == null) prec = 5;
	const out = [];
	let co = 0;
	const lmap = { "M": 2, "L": 2, "Q": 4, "C": 6 };
	const pathCmdsLength = path.cmds.length;
	for (let i = 0; i < pathCmdsLength; i++) {
		const cmd = path.cmds[i], cn = co + (lmap[cmd] ? lmap[cmd] : 0);
		out.push(cmd);
		while (co < cn) { const c = path.crds[co++]; out.push(parseFloat(c.toFixed(prec)) + (co == cn ? "" : " ")); }
	}
	return out.join("");
}


utils.P = {};
utils.P.moveTo = function (p, x, y) {
	p.cmds.push("M"); p.crds.push(x, y);
}
utils.P.lineTo = function (p, x, y) {
	p.cmds.push("L"); p.crds.push(x, y);
}
utils.P.curveTo = function (p, a, b, c, d, e, f) {
	p.cmds.push("C"); p.crds.push(a, b, c, d, e, f);
}
utils.P.qcurveTo = function (p, a, b, c, d) {
	p.cmds.push("Q"); p.crds.push(a, b, c, d);
}
utils.P.closePath = function (p) { p.cmds.push("Z"); }


utils._drawCFF = function (cmds, state, font, pdct, p) {
	const stack = state.stack;
	let open = state.open;
	let nStems = state.nStems;
	let width = state.width;
	let haveWidth = state.haveWidth;
	let i = 0;
	let c1x = 0, c1y = 0, c2x = 0, c2y = 0, c3x = 0, c3y = 0, c4x = 0, c4y = 0, jpx = 0, jpy = 0;
	let x = state.x;
	let y = state.y;

	const o = { val: 0, size: 0 };
	while (i < cmds.length) {
		CFF.getCharString(cmds, i, o);
		const v = o.val;
		i += o.size;

		if (v == "o1" || v == "o18")  //  hstem || hstemhm
		{
			let hasWidthArg;

			// The number of stem operators on the stack is always even.
			// If the value is uneven, that means a width is specified.
			hasWidthArg = stack.length % 2 !== 0;
			if (hasWidthArg && !haveWidth) {
				width = stack.shift() + pdct.nominalWidthX;
			}

			nStems += stack.length >> 1;
			stack.length = 0;
			haveWidth = true;
		}
		else if (v == "o3" || v == "o23")  // vstem || vstemhm
		{
			let hasWidthArg;

			// The number of stem operators on the stack is always even.
			// If the value is uneven, that means a width is specified.
			hasWidthArg = stack.length % 2 !== 0;
			if (hasWidthArg && !haveWidth) {
				width = stack.shift() + pdct.nominalWidthX;
			}

			nStems += stack.length >> 1;
			stack.length = 0;
			haveWidth = true;
		}
		else if (v == "o4") {
			if (stack.length > 1 && !haveWidth) {
				width = stack.shift() + pdct.nominalWidthX;
				haveWidth = true;
			}
			if (open) utils.P.closePath(p);

			y += stack.pop();
			utils.P.moveTo(p, x, y); open = true;
		}
		else if (v == "o5") {
			while (stack.length > 0) {
				x += stack.shift();
				y += stack.shift();
				utils.P.lineTo(p, x, y);
			}
		}
		else if (v == "o6" || v == "o7")  // hlineto || vlineto
		{
			const count = stack.length;
			let isX = (v == "o6");

			for (let j = 0; j < count; j++) {
				const sval = stack.shift();

				if (isX) x += sval; else y += sval;
				isX = !isX;
				utils.P.lineTo(p, x, y);
			}
		}
		else if (v == "o8" || v == "o24")	// rrcurveto || rcurveline
		{
			const count = stack.length;
			let index = 0;
			while (index + 6 <= count) {
				c1x = x + stack.shift();
				c1y = y + stack.shift();
				c2x = c1x + stack.shift();
				c2y = c1y + stack.shift();
				x = c2x + stack.shift();
				y = c2y + stack.shift();
				utils.P.curveTo(p, c1x, c1y, c2x, c2y, x, y);
				index += 6;
			}
			if (v == "o24") {
				x += stack.shift();
				y += stack.shift();
				utils.P.lineTo(p, x, y);
			}
		}
		else if (v == "o11") break;
		else if (v == "o1234" || v == "o1235" || v == "o1236" || v == "o1237")//if((v+"").slice(0,3)=="o12")
		{
			if (v == "o1234") {
				c1x = x + stack.shift();    // dx1
				c1y = y;                      // dy1
				c2x = c1x + stack.shift();    // dx2
				c2y = c1y + stack.shift();    // dy2
				jpx = c2x + stack.shift();    // dx3
				jpy = c2y;                    // dy3
				c3x = jpx + stack.shift();    // dx4
				c3y = c2y;                    // dy4
				c4x = c3x + stack.shift();    // dx5
				c4y = y;                      // dy5
				x = c4x + stack.shift();      // dx6
				utils.P.curveTo(p, c1x, c1y, c2x, c2y, jpx, jpy);
				utils.P.curveTo(p, c3x, c3y, c4x, c4y, x, y);

			}
			if (v == "o1235") {
				c1x = x + stack.shift();    // dx1
				c1y = y + stack.shift();    // dy1
				c2x = c1x + stack.shift();    // dx2
				c2y = c1y + stack.shift();    // dy2
				jpx = c2x + stack.shift();    // dx3
				jpy = c2y + stack.shift();    // dy3
				c3x = jpx + stack.shift();    // dx4
				c3y = jpy + stack.shift();    // dy4
				c4x = c3x + stack.shift();    // dx5
				c4y = c3y + stack.shift();    // dy5
				x = c4x + stack.shift();      // dx6
				y = c4y + stack.shift();      // dy6
				stack.shift();                // flex depth
				utils.P.curveTo(p, c1x, c1y, c2x, c2y, jpx, jpy);
				utils.P.curveTo(p, c3x, c3y, c4x, c4y, x, y);
			}
			if (v == "o1236") {
				c1x = x + stack.shift();    // dx1
				c1y = y + stack.shift();    // dy1
				c2x = c1x + stack.shift();    // dx2
				c2y = c1y + stack.shift();    // dy2
				jpx = c2x + stack.shift();    // dx3
				jpy = c2y;                    // dy3
				c3x = jpx + stack.shift();    // dx4
				c3y = c2y;                    // dy4
				c4x = c3x + stack.shift();    // dx5
				c4y = c3y + stack.shift();    // dy5
				x = c4x + stack.shift();      // dx6
				utils.P.curveTo(p, c1x, c1y, c2x, c2y, jpx, jpy);
				utils.P.curveTo(p, c3x, c3y, c4x, c4y, x, y);
			}
			if (v == "o1237") {
				c1x = x + stack.shift();    // dx1
				c1y = y + stack.shift();    // dy1
				c2x = c1x + stack.shift();    // dx2
				c2y = c1y + stack.shift();    // dy2
				jpx = c2x + stack.shift();    // dx3
				jpy = c2y + stack.shift();    // dy3
				c3x = jpx + stack.shift();    // dx4
				c3y = jpy + stack.shift();    // dy4
				c4x = c3x + stack.shift();    // dx5
				c4y = c3y + stack.shift();    // dy5
				if (Math.abs(c4x - x) > Math.abs(c4y - y)) {
					x = c4x + stack.shift();
				} else {
					y = c4y + stack.shift();
				}
				utils.P.curveTo(p, c1x, c1y, c2x, c2y, jpx, jpy);
				utils.P.curveTo(p, c3x, c3y, c4x, c4y, x, y);
			}
		}
		else if (v == "o14") {
			if (stack.length > 0 && !haveWidth) {
				width = stack.shift() + font.nominalWidthX;
				haveWidth = true;
			}
			if (stack.length == 4) // seac = standard encoding accented character
			{
				const adx = stack.shift();
				const ady = stack.shift();
				const bchar = stack.shift();
				const achar = stack.shift();

				const bind = CFF.glyphBySE(font, bchar);
				const aind = CFF.glyphBySE(font, achar);

				//state.x=x; state.y=y; state.nStems=nStems; state.haveWidth=haveWidth; state.width=width;  state.open=open;

				utils._drawCFF(font.CharStrings[bind], state, font, pdct, p);
				state.x = adx; state.y = ady;
				utils._drawCFF(font.CharStrings[aind], state, font, pdct, p);

				//x=state.x; y=state.y; nStems=state.nStems; haveWidth=state.haveWidth; width=state.width;  open=state.open;
			}
			if (open) { utils.P.closePath(p); open = false; }
		}
		else if (v == "o19" || v == "o20") {
			let hasWidthArg;

			// The number of stem operators on the stack is always even.
			// If the value is uneven, that means a width is specified.
			hasWidthArg = stack.length % 2 !== 0;
			if (hasWidthArg && !haveWidth) {
				width = stack.shift() + pdct.nominalWidthX;
			}

			nStems += stack.length >> 1;
			stack.length = 0;
			haveWidth = true;

			i += (nStems + 7) >> 3;
		}

		else if (v == "o21") {
			if (stack.length > 2 && !haveWidth) {
				width = stack.shift() + pdct.nominalWidthX;
				haveWidth = true;
			}

			y += stack.pop();
			x += stack.pop();

			if (open) utils.P.closePath(p);
			utils.P.moveTo(p, x, y); open = true;
		}
		else if (v == "o22") {
			if (stack.length > 1 && !haveWidth) {
				width = stack.shift() + pdct.nominalWidthX;
				haveWidth = true;
			}

			x += stack.pop();

			if (open) utils.P.closePath(p);
			utils.P.moveTo(p, x, y); open = true;
		}
		else if (v == "o25") {
			while (stack.length > 6) {
				x += stack.shift();
				y += stack.shift();
				utils.P.lineTo(p, x, y);
			}

			c1x = x + stack.shift();
			c1y = y + stack.shift();
			c2x = c1x + stack.shift();
			c2y = c1y + stack.shift();
			x = c2x + stack.shift();
			y = c2y + stack.shift();
			utils.P.curveTo(p, c1x, c1y, c2x, c2y, x, y);
		}
		else if (v == "o26") {
			if (stack.length % 2) {
				x += stack.shift();
			}

			while (stack.length > 0) {
				c1x = x;
				c1y = y + stack.shift();
				c2x = c1x + stack.shift();
				c2y = c1y + stack.shift();
				x = c2x;
				y = c2y + stack.shift();
				utils.P.curveTo(p, c1x, c1y, c2x, c2y, x, y);
			}

		}
		else if (v == "o27") {
			if (stack.length % 2) {
				y += stack.shift();
			}

			while (stack.length > 0) {
				c1x = x + stack.shift();
				c1y = y;
				c2x = c1x + stack.shift();
				c2y = c1y + stack.shift();
				x = c2x + stack.shift();
				y = c2y;
				utils.P.curveTo(p, c1x, c1y, c2x, c2y, x, y);
			}
		}
		else if (v == "o10" || v == "o29")	// callsubr || callgsubr
		{
			const obj = (v == "o10" ? pdct : font);
			if (stack.length == 0) { console.log("error: empty stack"); }
			else {
				const ind = stack.pop();
				const subr = obj.Subrs[ind + obj.Bias];
				state.x = x; state.y = y; state.nStems = nStems; state.haveWidth = haveWidth; state.width = width; state.open = open;
				utils._drawCFF(subr, state, font, pdct, p);
				x = state.x; y = state.y; nStems = state.nStems; haveWidth = state.haveWidth; width = state.width; open = state.open;
			}
		}
		else if (v == "o30" || v == "o31")   // vhcurveto || hvcurveto
		{
			let count;
			const count1 = stack.length;
			let index = 0;
			let alternate = v == "o31";

			count = count1 & ~2;
			index += count1 - count;

			while (index < count) {
				if (alternate) {
					c1x = x + stack.shift();
					c1y = y;
					c2x = c1x + stack.shift();
					c2y = c1y + stack.shift();
					y = c2y + stack.shift();
					if (count - index == 5) { x = c2x + stack.shift(); index++; }
					else x = c2x;
					alternate = false;
				}
				else {
					c1x = x;
					c1y = y + stack.shift();
					c2x = c1x + stack.shift();
					c2y = c1y + stack.shift();
					x = c2x + stack.shift();
					if (count - index == 5) { y = c2y + stack.shift(); index++; }
					else y = c2y;
					alternate = true;
				}
				utils.P.curveTo(p, c1x, c1y, c2x, c2y, x, y);
				index += 4;
			}
		}

		else if ((v + "").charAt(0) == "o") { console.log("Unknown operation: " + v, cmds); throw v; }
		else stack.push(v);
	}
	state.x = x; state.y = y; state.nStems = nStems; state.haveWidth = haveWidth; state.width = width; state.open = open;
}

export default utils;