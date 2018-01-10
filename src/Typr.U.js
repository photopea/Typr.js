// Require modules
var tabs = require('./tabs.js');
var _lctf = require('./lctf.js');

// Create utility
var utility = {};

utility.codeToGlyph = function (font, code) {
  var cmap = font.cmap;

  var tind = -1;
  if (cmap.p0e4 != null) tind = cmap.p0e4;
  else if (cmap.p3e1 != null) tind = cmap.p3e1;
  else if (cmap.p1e0 != null) tind = cmap.p1e0;

  if (tind == -1) throw "no familiar platform and encoding!";

  var tab = cmap.tables[tind];

  if (tab.format == 0) {
    if (code >= tab.map.length) return 0;
    return tab.map[code];
  }
  else if (tab.format == 4) {
    var sind = -1;
    for (var i = 0; i < tab.endCount.length; i++) if (code <= tab.endCount[i]) {
      sind = i;
      break;
    }
    if (sind == -1) return 0;
    if (tab.startCount[sind] > code) return 0;

    var gli = 0;
    if (tab.idRangeOffset[sind] != 0) gli = tab.glyphIdArray[(code - tab.startCount[sind]) + (tab.idRangeOffset[sind] >> 1) - (tab.idRangeOffset.length - sind)];
    else gli = code + tab.idDelta[sind];
    return gli & 0xFFFF;
  }
  else if (tab.format == 12) {
    if (code > tab.groups[tab.groups.length - 1][1]) return 0;
    for (var i = 0; i < tab.groups.length; i++) {
      var grp = tab.groups[i];
      if (grp[0] <= code && code <= grp[1]) return grp[2] + (code - grp[0]);
    }
    return 0;
  }
  else throw "unknown cmap table format " + tab.format;
}

utility.glyphToPath = function (font, gid) {
  var path = {cmds: [], crds: []};
  if (font.CFF) {
    var state = {
      x: 0,
      y: 0,
      stack: [],
      nStems: 0,
      haveWidth: false,
      width: font.CFF.Private ? font.CFF.Private.defaultWidthX : 0,
      open: false
    };
    utility._drawCFF(font.CFF.CharStrings[gid], state, font.CFF, path);
  }
  if (font.glyf) utility._drawGlyf(gid, font, path);
  return path;
}

utility._drawGlyf = function (gid, font, path) {
  var gl = font.glyf[gid];
  if (gl == null) gl = font.glyf[gid] = tabs.glyf._parseGlyf(font, gid);
  if (gl != null) {
    if (gl.noc > -1) utility._simpleGlyph(gl, path);
    else utility._compoGlyph(gl, font, path);
  }
}
utility._simpleGlyph = function (gl, p) {
  for (var c = 0; c < gl.noc; c++) {
    var i0 = (c == 0) ? 0 : (gl.endPts[c - 1] + 1);
    var il = gl.endPts[c];

    for (var i = i0; i <= il; i++) {
      var pr = (i == i0) ? il : (i - 1);
      var nx = (i == il) ? i0 : (i + 1);
      var onCurve = gl.flags[i] & 1;
      var prOnCurve = gl.flags[pr] & 1;
      var nxOnCurve = gl.flags[nx] & 1;

      var x = gl.xs[i], y = gl.ys[i];

      if (i == i0) {
        if (onCurve) {
          if (prOnCurve) utility.P.moveTo(p, gl.xs[pr], gl.ys[pr]);
          else {
            utility.P.moveTo(p, x, y);
            continue;
            /*  will do curveTo at il  */
          }
        }
        else {
          if (prOnCurve) utility.P.moveTo(p, gl.xs[pr], gl.ys[pr]);
          else utility.P.moveTo(p, (gl.xs[pr] + x) / 2, (gl.ys[pr] + y) / 2);
        }
      }
      if (onCurve) {
        if (prOnCurve) utility.P.lineTo(p, x, y);
      }
      else {
        if (nxOnCurve) utility.P.qcurveTo(p, x, y, gl.xs[nx], gl.ys[nx]);
        else utility.P.qcurveTo(p, x, y, (x + gl.xs[nx]) / 2, (y + gl.ys[nx]) / 2);
      }
    }
    utility.P.closePath(p);
  }
}
utility._compoGlyph = function (gl, font, p) {
  for (var j = 0; j < gl.parts.length; j++) {
    var path = {cmds: [], crds: []};
    var prt = gl.parts[j];
    utility._drawGlyf(prt.glyphIndex, font, path);

    var m = prt.m;
    for (var i = 0; i < path.crds.length; i += 2) {
      var x = path.crds[i], y = path.crds[i + 1];
      p.crds.push(x * m.a + y * m.b + m.tx);
      p.crds.push(x * m.c + y * m.d + m.ty);
    }
    for (var i = 0; i < path.cmds.length; i++) p.cmds.push(path.cmds[i]);
  }
}

utility._getGlyphClass = function (g, cd) {
  for (var i = 0; i < cd.start.length; i++)
    if (cd.start[i] <= g && cd.end[i] >= g) return cd.class[i];
  return 0;
}

utility.getPairAdjustment = function (font, g1, g2) {
  if (font.GPOS) {
    var ltab = null;
    for (var i = 0; i < font.GPOS.featureList.length; i++) {
      var fl = font.GPOS.featureList[i];
      if (fl.tag == "kern")
        for (var j = 0; j < fl.tab.length; j++)
          if (font.GPOS.lookupList[fl.tab[j]].ltype == 2) ltab = font.GPOS.lookupList[fl.tab[j]];
    }
    if (ltab) {
      var adjv = 0;
      for (var i = 0; i < ltab.tabs.length; i++) {
        var tab = ltab.tabs[i];
        var ind = _lctf.coverageIndex(tab.coverage, g1);
        if (ind == -1) continue;
        var adj;
        if (tab.format == 1) {
          var right = tab.pairsets[ind];
          for (var j = 0; j < right.length; j++) if (right[j].gid2 == g2) adj = right[j];
          if (adj == null) continue;
        }
        else if (tab.format == 2) {
          var c1 = utility._getGlyphClass(g1, tab.classDef1);
          var c2 = utility._getGlyphClass(g2, tab.classDef2);
          var adj = tab.matrix[c1][c2];
        }
        return adj.val1[2];
      }
    }
  }
  if (font.kern) {
    var ind1 = font.kern.glyph1.indexOf(g1);
    if (ind1 != -1) {
      var ind2 = font.kern.rval[ind1].glyph2.indexOf(g2);
      if (ind2 != -1) return font.kern.rval[ind1].vals[ind2];
    }
  }

  return 0;
}

utility.stringToGlyphs = function (font, str) {
  var gls = [];
  for (var i = 0; i < str.length; i++) gls.push(utility.codeToGlyph(font, str.charCodeAt(i)));

  //console.log(gls);  return gls;

  var gsub = font["GSUB"];
  if (gsub == null) return gls;
  var llist = gsub.lookupList, flist = gsub.featureList;

  var wsep = "\n\t\" ,.:;!?()  ،";
  var R = "آأؤإاةدذرزوٱٲٳٵٶٷڈډڊڋڌڍڎڏڐڑڒړڔڕږڗژڙۀۃۄۅۆۇۈۉۊۋۍۏےۓەۮۯܐܕܖܗܘܙܞܨܪܬܯݍݙݚݛݫݬݱݳݴݸݹࡀࡆࡇࡉࡔࡧࡩࡪࢪࢫࢬࢮࢱࢲࢹૅેૉ૊૎૏ૐ૑૒૝ૡ૤૯஁ஃ஄அஉ஌எஏ஑னப஫஬";
  var L = "ꡲ્૗";

  for (var ci = 0; ci < gls.length; ci++) {
    var gl = gls[ci];

    var slft = ci == 0 || wsep.indexOf(str[ci - 1]) != -1;
    var srgt = ci == gls.length - 1 || wsep.indexOf(str[ci + 1]) != -1;

    if (!slft && R.indexOf(str[ci - 1]) != -1) slft = true;
    if (!srgt && R.indexOf(str[ci]) != -1) srgt = true;

    if (!srgt && L.indexOf(str[ci + 1]) != -1) srgt = true;
    if (!slft && L.indexOf(str[ci]) != -1) slft = true;

    var feat = null;
    if (slft) feat = srgt ? "isol" : "init";
    else feat = srgt ? "fina" : "medi";

    for (var fi = 0; fi < flist.length; fi++) {
      if (flist[fi].tag != feat) continue;
      for (var ti = 0; ti < flist[fi].tab.length; ti++) {
        var tab = llist[flist[fi].tab[ti]];
        if (tab.ltype != 1) continue;
        for (var j = 0; j < tab.tabs.length; j++) {
          var ttab = tab.tabs[j];
          var ind = _lctf.coverageIndex(ttab.coverage, gl);
          if (ind == -1) continue;
          if (ttab.fmt == 0) gls[ci] = ind + ttab.delta;
          else gls[ci] = ttab.newg[ind];
          //console.log(ci, gl, "subst", flist[fi].tag, i, j, ttab.newg[ind]);
        }
      }
    }
  }
  var cligs = ["rlig", "liga"];

  for (var ci = 0; ci < gls.length; ci++) {
    var gl = gls[ci];
    var rlim = Math.min(3, gls.length - ci - 1);
    for (var fi = 0; fi < flist.length; fi++) {

      var fl = flist[fi];
      if (cligs.indexOf(fl.tag) == -1) continue;
      for (var ti = 0; ti < fl.tab.length; ti++) {
        var tab = llist[fl.tab[ti]];
        if (tab.ltype != 4) continue;
        for (var j = 0; j < tab.tabs.length; j++) {
          var ind = _lctf.coverageIndex(tab.tabs[j].coverage, gl);
          if (ind == -1) continue;
          var vals = tab.tabs[j].vals[ind];

          for (var k = 0; k < vals.length; k++) {
            var lig = vals[k], rl = lig.chain.length;
            if (rl > rlim) continue;
            var good = true;
            for (var l = 0; l < rl; l++) if (lig.chain[l] != gls[ci + (1 + l)]) good = false;
            if (!good) continue;
            gls[ci] = lig.nglyph;
            for (var l = 0; l < rl; l++) gls[ci + l + 1] = -1;
            //console.log("lig", fl.tag,  gl, lig.chain, lig.nglyph);
          }
        }
      }
    }
  }
  return gls;
}

utility.glyphsToPath = function (font, gls) {
  //gls = gls.reverse();//gls.slice(0,12).concat(gls.slice(12).reverse());

  var tpath = {cmds: [], crds: []};
  var x = 0;

  for (var i = 0; i < gls.length; i++) {
    var gid = gls[i];
    if (gid == -1) continue;
    var gid2 = (i < gls.length - 1 && gls[i + 1] != -1) ? gls[i + 1] : 0;
    var path = utility.glyphToPath(font, gid);

    for (var j = 0; j < path.crds.length; j += 2) {
      tpath.crds.push(path.crds[j] + x);
      tpath.crds.push(path.crds[j + 1]);
    }
    for (var j = 0; j < path.cmds.length; j++) tpath.cmds.push(path.cmds[j]);
    x += font.hmtx.aWidth[gid];
    if (i < gls.length - 1) x += utility.getPairAdjustment(font, gid, gid2);
  }
  return tpath;
}

utility.pathToSVG = function (path, prec) {
  if (prec == null) prec = 5;
  var out = [], co = 0, lmap = {"M": 2, "L": 2, "Q": 4, "C": 6};
  for (var i = 0; i < path.cmds.length; i++) {
    var cmd = path.cmds[i], cn = co + (lmap[cmd] ? lmap[cmd] : 0);
    out.push(cmd);
    while (co < cn) {
      var c = path.crds[co++];
      out.push(parseFloat(c.toFixed(prec)) + (co == cn ? "" : " "));
    }
  }
  return out.join("");
}

utility.pathToContext = function (path, ctx) {
  var c = 0, crds = path.crds;

  for (var j = 0; j < path.cmds.length; j++) {
    var cmd = path.cmds[j];
    if (cmd == "M") {
      ctx.moveTo(crds[c], crds[c + 1]);
      c += 2;
    }
    else if (cmd == "L") {
      ctx.lineTo(crds[c], crds[c + 1]);
      c += 2;
    }
    else if (cmd == "C") {
      ctx.bezierCurveTo(crds[c], crds[c + 1], crds[c + 2], crds[c + 3], crds[c + 4], crds[c + 5]);
      c += 6;
    }
    else if (cmd == "Q") {
      ctx.quadraticCurveTo(crds[c], crds[c + 1], crds[c + 2], crds[c + 3]);
      c += 4;
    }
    else if (cmd == "Z") ctx.closePath();
  }
}

utility.P = {};
utility.P.moveTo = function (p, x, y) {
  p.cmds.push("M");
  p.crds.push(x, y);
}
utility.P.lineTo = function (p, x, y) {
  p.cmds.push("L");
  p.crds.push(x, y);
}
utility.P.curveTo = function (p, a, b, c, d, e, f) {
  p.cmds.push("C");
  p.crds.push(a, b, c, d, e, f);
}
utility.P.qcurveTo = function (p, a, b, c, d) {
  p.cmds.push("Q");
  p.crds.push(a, b, c, d);
}
utility.P.closePath = function (p) { p.cmds.push("Z"); }

utility._drawCFF = function (cmds, state, font, p) {
  var stack = state.stack;
  var nStems = state.nStems, haveWidth = state.haveWidth, width = state.width, open = state.open;
  var i = 0;
  var x = state.x, y = state.y, c1x = 0, c1y = 0, c2x = 0, c2y = 0, c3x = 0, c3y = 0, c4x = 0, c4y = 0, jpx = 0,
    jpy = 0;

  var o = {val: 0, size: 0};
  //console.log(cmds);
  while (i < cmds.length) {
    tabs.CFF.getCharString(cmds, i, o);
    var v = o.val;
    i += o.size;

    if (false) {}
    else if (v == "o1" || v == "o18")  //  hstem || hstemhm
    {
      var hasWidthArg;

      // The number of stem operators on the stack is always even.
      // If the value is uneven, that means a width is specified.
      hasWidthArg = stack.length % 2 !== 0;
      if (hasWidthArg && !haveWidth) {
        width = stack.shift() + font.Private.nominalWidthX;
      }

      nStems += stack.length >> 1;
      stack.length = 0;
      haveWidth = true;
    }
    else if (v == "o3" || v == "o23")  // vstem || vstemhm
    {
      var hasWidthArg;

      // The number of stem operators on the stack is always even.
      // If the value is uneven, that means a width is specified.
      hasWidthArg = stack.length % 2 !== 0;
      if (hasWidthArg && !haveWidth) {
        width = stack.shift() + font.Private.nominalWidthX;
      }

      nStems += stack.length >> 1;
      stack.length = 0;
      haveWidth = true;
    }
    else if (v == "o4") {
      if (stack.length > 1 && !haveWidth) {
        width = stack.shift() + font.Private.nominalWidthX;
        haveWidth = true;
      }
      if (open) utility.P.closePath(p);

      y += stack.pop();
      utility.P.moveTo(p, x, y);
      open = true;
    }
    else if (v == "o5") {
      while (stack.length > 0) {
        x += stack.shift();
        y += stack.shift();
        utility.P.lineTo(p, x, y);
      }
    }
    else if (v == "o6" || v == "o7")  // hlineto || vlineto
    {
      var count = stack.length;
      var isX = (v == "o6");

      for (var j = 0; j < count; j++) {
        var sval = stack.shift();

        if (isX) x += sval; else y += sval;
        isX = !isX;
        utility.P.lineTo(p, x, y);
      }
    }
    else if (v == "o8" || v == "o24")	// rrcurveto || rcurveline
    {
      var count = stack.length;
      var index = 0;
      while (index + 6 <= count) {
        c1x = x + stack.shift();
        c1y = y + stack.shift();
        c2x = c1x + stack.shift();
        c2y = c1y + stack.shift();
        x = c2x + stack.shift();
        y = c2y + stack.shift();
        utility.P.curveTo(p, c1x, c1y, c2x, c2y, x, y);
        index += 6;
      }
      if (v == "o24") {
        x += stack.shift();
        y += stack.shift();
        utility.P.lineTo(p, x, y);
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
        utility.P.curveTo(p, c1x, c1y, c2x, c2y, jpx, jpy);
        utility.P.curveTo(p, c3x, c3y, c4x, c4y, x, y);

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
        utility.P.curveTo(p, c1x, c1y, c2x, c2y, jpx, jpy);
        utility.P.curveTo(p, c3x, c3y, c4x, c4y, x, y);
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
        utility.P.curveTo(p, c1x, c1y, c2x, c2y, jpx, jpy);
        utility.P.curveTo(p, c3x, c3y, c4x, c4y, x, y);
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
        utility.P.curveTo(p, c1x, c1y, c2x, c2y, jpx, jpy);
        utility.P.curveTo(p, c3x, c3y, c4x, c4y, x, y);
      }
    }
    else if (v == "o14") {
      if (stack.length > 0 && !haveWidth) {
        width = stack.shift() + font.nominalWidthX;
        haveWidth = true;
      }
      if (stack.length == 4) // seac = standard encoding accented character
      {

        var asb = 0;
        var adx = stack.shift();
        var ady = stack.shift();
        var bchar = stack.shift();
        var achar = stack.shift();

        var bind = tabs.CFF.glyphBySE(font, bchar);
        var aind = tabs.CFF.glyphBySE(font, achar);

        //console.log(bchar, bind);
        //console.log(achar, aind);
        //state.x=x; state.y=y; state.nStems=nStems; state.haveWidth=haveWidth; state.width=width;  state.open=open;

        utility._drawCFF(font.CharStrings[bind], state, font, p);
        state.x = adx;
        state.y = ady;
        utility._drawCFF(font.CharStrings[aind], state, font, p);

        //x=state.x; y=state.y; nStems=state.nStems; haveWidth=state.haveWidth; width=state.width;  open=state.open;
      }
      if (open) {
        utility.P.closePath(p);
        open = false;
      }
    }
    else if (v == "o19" || v == "o20") {
      var hasWidthArg;

      // The number of stem operators on the stack is always even.
      // If the value is uneven, that means a width is specified.
      hasWidthArg = stack.length % 2 !== 0;
      if (hasWidthArg && !haveWidth) {
        width = stack.shift() + font.Private.nominalWidthX;
      }

      nStems += stack.length >> 1;
      stack.length = 0;
      haveWidth = true;

      i += (nStems + 7) >> 3;
    }

    else if (v == "o21") {
      if (stack.length > 2 && !haveWidth) {
        width = stack.shift() + font.Private.nominalWidthX;
        haveWidth = true;
      }

      y += stack.pop();
      x += stack.pop();

      if (open) utility.P.closePath(p);
      utility.P.moveTo(p, x, y);
      open = true;
    }
    else if (v == "o22") {
      if (stack.length > 1 && !haveWidth) {
        width = stack.shift() + font.Private.nominalWidthX;
        haveWidth = true;
      }

      x += stack.pop();

      if (open) utility.P.closePath(p);
      utility.P.moveTo(p, x, y);
      open = true;
    }
    else if (v == "o25") {
      while (stack.length > 6) {
        x += stack.shift();
        y += stack.shift();
        utility.P.lineTo(p, x, y);
      }

      c1x = x + stack.shift();
      c1y = y + stack.shift();
      c2x = c1x + stack.shift();
      c2y = c1y + stack.shift();
      x = c2x + stack.shift();
      y = c2y + stack.shift();
      utility.P.curveTo(p, c1x, c1y, c2x, c2y, x, y);
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
        utility.P.curveTo(p, c1x, c1y, c2x, c2y, x, y);
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
        utility.P.curveTo(p, c1x, c1y, c2x, c2y, x, y);
      }
    }
    else if (v == "o10" || v == "o29")	// callsubr || callgsubr
    {
      var obj = (v == "o10" ? font.Private : font);
      if (stack.length == 0) { console.log("error: empty stack"); }
      else {
        var ind = stack.pop();
        var subr = obj.Subrs[ind + obj.Bias];
        state.x = x;
        state.y = y;
        state.nStems = nStems;
        state.haveWidth = haveWidth;
        state.width = width;
        state.open = open;
        utility._drawCFF(subr, state, font, p);
        x = state.x;
        y = state.y;
        nStems = state.nStems;
        haveWidth = state.haveWidth;
        width = state.width;
        open = state.open;
      }
    }
    else if (v == "o30" || v == "o31")   // vhcurveto || hvcurveto
    {
      var count, count1 = stack.length;
      var index = 0;
      var alternate = v == "o31";

      count = count1 & ~2;
      index += count1 - count;

      while (index < count) {
        if (alternate) {
          c1x = x + stack.shift();
          c1y = y;
          c2x = c1x + stack.shift();
          c2y = c1y + stack.shift();
          y = c2y + stack.shift();
          if (count - index == 5) {
            x = c2x + stack.shift();
            index++;
          }
          else x = c2x;
          alternate = false;
        }
        else {
          c1x = x;
          c1y = y + stack.shift();
          c2x = c1x + stack.shift();
          c2y = c1y + stack.shift();
          x = c2x + stack.shift();
          if (count - index == 5) {
            y = c2y + stack.shift();
            index++;
          }
          else y = c2y;
          alternate = true;
        }
        utility.P.curveTo(p, c1x, c1y, c2x, c2y, x, y);
        index += 4;
      }
    }

    else if ((v + "").charAt(0) == "o") {
      console.log("Unknown operation: " + v, cmds);
      throw v;
    }
    else stack.push(v);
  }
  //console.log(cmds);
  state.x = x;
  state.y = y;
  state.nStems = nStems;
  state.haveWidth = haveWidth;
  state.width = width;
  state.open = open;
}

module.exports = utility;