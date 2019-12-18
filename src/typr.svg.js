import bin from './typr.bin';

/* eslint-disable no-unused-vars */

const SVG = {};

SVG.parse = function (data, offset, length) {
	const obj = { entries: [] };

	const offset0 = offset;

	const tableVersion = bin.readUshort(data, offset); offset += 2;
	const svgDocIndexOffset = bin.readUint(data, offset); offset += 4;
	const reserved = bin.readUint(data, offset); offset += 4;

	offset = svgDocIndexOffset + offset0;

	const numEntries = bin.readUshort(data, offset); offset += 2;

	for (let i = 0; i < numEntries; i++) {
		const startGlyphID = bin.readUshort(data, offset); offset += 2;
		const endGlyphID = bin.readUshort(data, offset); offset += 2;
		const svgDocOffset = bin.readUint(data, offset); offset += 4;
		const svgDocLength = bin.readUint(data, offset); offset += 4;

		const sbuf = new Uint8Array(data.buffer, offset0 + svgDocOffset + svgDocIndexOffset, svgDocLength);
		const svg = bin.readUTF8(sbuf, 0, sbuf.length);

		for (let f = startGlyphID; f <= endGlyphID; f++) {
			obj.entries[f] = svg;
		}
	}
	return obj;
}

SVG.toPath = function (str) {
	const pth = { cmds: [], crds: [] };
	if (str == null) return pth;

	const prsr = new DOMParser();
	const doc = prsr["parseFromString"](str, "image/svg+xml");

	let svg = doc.firstChild; while (svg.tagName != "svg") svg = svg.nextSibling;
	let vb = svg.getAttribute("viewBox");
	if (vb) vb = vb.trim().split(" ").map(parseFloat); else vb = [0, 0, 1000, 1000];
	SVG._toPath(svg.children, pth);
	const pthCrdsLength = pth.crds.length
	for (let i = 0; i < pthCrdsLength; i += 2) {
		let x = pth.crds[i], y = pth.crds[i + 1];
		x -= vb[0];
		y -= vb[1];
		y = -y;
		pth.crds[i] = x;
		pth.crds[i + 1] = y;
	}
	return pth;
}

SVG._toPath = function (nds, pth, fill) {
	const ndsLength = nds.length;
	for (let ni = 0; ni < ndsLength; ni++) {
		const nd = nds[ni], tn = nd.tagName;
		let cfl = nd.getAttribute("fill"); if (cfl == null) cfl = fill;
		if (tn == "g") SVG._toPath(nd.children, pth, cfl);
		else if (tn == "path") {
			pth.cmds.push(cfl ? cfl : "#000000");
			const d = nd.getAttribute("d");
			const toks = SVG._tokens(d);
			SVG._toksToPath(toks, pth); pth.cmds.push("X");
		}
	}
}

SVG._tokens = function (d) {
	const ts = [];  // reading number, current number
	let off = 0;
	let cn = '';
	let rn = false;
	while (off < d.length) {
		const cc = d.charCodeAt(off), ch = d.charAt(off); off++;
		const isNum = (48 <= cc && cc <= 57) || ch == "." || ch == "-";

		if (rn) {
			if (ch == "-") { ts.push(parseFloat(cn)); cn = ch; }
			else if (isNum) cn += ch;
			else { ts.push(parseFloat(cn)); if (ch != "," && ch != " ") ts.push(ch); rn = false; }
		}
		else {
			if (isNum) { cn = ch; rn = true; }
			else if (ch != "," && ch != " ") ts.push(ch);
		}
	}
	if (rn) ts.push(parseFloat(cn));
	return ts;
}

SVG._toksToPath = function (ts, pth) {
	let i = 0, x = 0, y = 0, ox = 0, oy = 0;
	const pc = { "M": 2, "L": 2, "H": 1, "V": 1, "S": 4, "C": 6 };
	const cmds = pth.cmds, crds = pth.crds;

	while (i < ts.length) {
		const cmd = ts[i]; i++;

		if (cmd == "z") { cmds.push("Z"); x = ox; y = oy; }
		else {
			const cmu = cmd.toUpperCase();
			const ps = pc[cmu], reps = SVG._reps(ts, i, ps);

			for (let j = 0; j < reps; j++) {
				let xi = 0, yi = 0; if (cmd != cmu) { xi = x; yi = y; }

				if (cmu == "M") { x = xi + ts[i++]; y = yi + ts[i++]; cmds.push("M"); crds.push(x, y); ox = x; oy = y; }
				else if (cmu == "L") { x = xi + ts[i++]; y = yi + ts[i++]; cmds.push("L"); crds.push(x, y); }
				else if (cmu == "H") { x = xi + ts[i++]; cmds.push("L"); crds.push(x, y); }
				else if (cmu == "V") { y = yi + ts[i++]; cmds.push("L"); crds.push(x, y); }
				else if (cmu == "C") {
					const x1 = xi + ts[i++], y1 = yi + ts[i++], x2 = xi + ts[i++], y2 = yi + ts[i++], x3 = xi + ts[i++], y3 = yi + ts[i++];
					cmds.push("C"); crds.push(x1, y1, x2, y2, x3, y3); x = x3; y = y3;
				}
				else if (cmu == "S") {
					const co = Math.max(crds.length - 4, 0);
					const x1 = x + x - crds[co], y1 = y + y - crds[co + 1];
					const x2 = xi + ts[i++], y2 = yi + ts[i++], x3 = xi + ts[i++], y3 = yi + ts[i++];
					cmds.push("C"); crds.push(x1, y1, x2, y2, x3, y3); x = x3; y = y3;
				}
			}
		}
	}
}
SVG._reps = function (ts, off, ps) {
	let i = off;
	while (i < ts.length) { if ((typeof ts[i]) == "string") break; i += ps; }
	return (i - off) / ps;
}

export default SVG;