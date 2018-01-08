// Require modules
var _lctf = require('../lctf.js');

var GSUB = {};
GSUB.parse = function (data, offset, length, font) { return _lctf.parse(data, offset, length, font, GSUB.subt); }

GSUB.subt = function (data, ltype, offset)	// lookup type
{
  var bin = _bin, offset0 = offset, tab = {};

  if (ltype != 1 && ltype != 4) return null;

  tab.fmt = bin.readUshort(data, offset);
  offset += 2;
  var covOff = bin.readUshort(data, offset);
  offset += 2;
  tab.coverage = _lctf.readCoverage(data, covOff + offset0);	// not always is coverage here

  if (false) {}
  else if (ltype == 1) {
    if (tab.fmt == 1) {
      tab.delta = bin.readShort(data, offset);
      offset += 2;
    }
    else if (tab.fmt == 2) {
      var cnt = bin.readUshort(data, offset);
      offset += 2;
      tab.newg = bin.readUshorts(data, offset, cnt);
      offset += tab.newg.length * 2;
    }
  }
  else if (ltype == 4) {
    tab.vals = [];
    var cnt = bin.readUshort(data, offset);
    offset += 2;
    for (var i = 0; i < cnt; i++) {
      var loff = bin.readUshort(data, offset);
      offset += 2;
      tab.vals.push(GSUB.readLigatureSet(data, offset0 + loff));
    }
    //console.log(tab.coverage);
    //console.log(tab.vals);
  }
  /*
   else if(ltype==6) {
     if(fmt==2) {
       var btDef = bin.readUshort(data, offset);  offset+=2;
       var inDef = bin.readUshort(data, offset);  offset+=2;
       var laDef = bin.readUshort(data, offset);  offset+=2;

       tab.btDef = _lctf.readClassDef(data, offset0 + btDef);
       tab.inDef = _lctf.readClassDef(data, offset0 + inDef);
       tab.laDef = _lctf.readClassDef(data, offset0 + laDef);

       tab.scset = [];
       var cnt = bin.readUshort(data, offset);  offset+=2;
       for(var i=0; i<cnt; i++) {
         var loff = bin.readUshort(data, offset);  offset+=2;
         tab.scset.push(GSUB.readChainSubClassSet(data, offset0+loff));
       }
     }
   } */
  //if(tab.coverage.indexOf(3)!=-1) console.log(ltype, fmt, tab);

  return tab;
}

GSUB.readChainSubClassSet = function (data, offset) {
  var bin = _bin, offset0 = offset, lset = [];
  var cnt = bin.readUshort(data, offset);
  offset += 2;
  for (var i = 0; i < cnt; i++) {
    var loff = bin.readUshort(data, offset);
    offset += 2;
    lset.push(GSUB.readChainSubClassRule(data, offset0 + loff));
  }
  return lset;
}
GSUB.readChainSubClassRule = function (data, offset) {
  var bin = _bin, offset0 = offset, rule = {};
  var pps = ["backtrack", "input", "lookahead"];
  for (var pi = 0; pi < pps.length; pi++) {
    var cnt = bin.readUshort(data, offset);
    offset += 2;
    if (pi == 1) cnt--;
    rule[pps[pi]] = bin.readUshorts(data, offset, cnt);
    offset += rule[pps[pi]].length * 2;
  }
  var cnt = bin.readUshort(data, offset);
  offset += 2;
  rule.subst = bin.readUshorts(data, offset, cnt * 2);
  offset += rule.subst.length * 2;
  return rule;
}

GSUB.readLigatureSet = function (data, offset) {
  var bin = _bin, offset0 = offset, lset = [];
  var lcnt = bin.readUshort(data, offset);
  offset += 2;
  for (var j = 0; j < lcnt; j++) {
    var loff = bin.readUshort(data, offset);
    offset += 2;
    lset.push(GSUB.readLigature(data, offset0 + loff));
  }
  return lset;
}
GSUB.readLigature = function (data, offset) {
  var bin = _bin, lig = {chain: []};
  lig.nglyph = bin.readUshort(data, offset);
  offset += 2;
  var ccnt = bin.readUshort(data, offset);
  offset += 2;
  for (var k = 0; k < ccnt - 1; k++) {
    lig.chain.push(bin.readUshort(data, offset));
    offset += 2;
  }
  return lig;
}

module.exports = GSUB;