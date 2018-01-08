// Require modules
var _lctf = require('../lctf.js');

var GPOS = {};
GPOS.parse = function (data, offset, length, font) { return _lctf.parse(data, offset, length, font, GPOS.subt); }

GPOS.subt = function (data, ltype, offset)	// lookup type
{
  if (ltype != 2) return null;

  var bin = _bin, offset0 = offset, tab = {};

  tab.format = bin.readUshort(data, offset);
  offset += 2;
  var covOff = bin.readUshort(data, offset);
  offset += 2;
  tab.coverage = _lctf.readCoverage(data, covOff + offset0);
  tab.valFmt1 = bin.readUshort(data, offset);
  offset += 2;
  tab.valFmt2 = bin.readUshort(data, offset);
  offset += 2;
  var ones1 = _lctf.numOfOnes(tab.valFmt1);
  var ones2 = _lctf.numOfOnes(tab.valFmt2);
  if (tab.format == 1) {
    tab.pairsets = [];
    var count = bin.readUshort(data, offset);
    offset += 2;

    for (var i = 0; i < count; i++) {
      var psoff = bin.readUshort(data, offset);
      offset += 2;
      psoff += offset0;
      var pvcount = bin.readUshort(data, psoff);
      psoff += 2;
      var arr = [];
      for (var j = 0; j < pvcount; j++) {
        var gid2 = bin.readUshort(data, psoff);
        psoff += 2;
        var value1, value2;
        if (tab.valFmt1 != 0) {
          value1 = _lctf.readValueRecord(data, psoff, tab.valFmt1);
          psoff += ones1 * 2;
        }
        if (tab.valFmt2 != 0) {
          value2 = _lctf.readValueRecord(data, psoff, tab.valFmt2);
          psoff += ones2 * 2;
        }
        arr.push({gid2: gid2, val1: value1, val2: value2});
      }
      tab.pairsets.push(arr);
    }
  }
  if (tab.format == 2) {
    var classDef1 = bin.readUshort(data, offset);
    offset += 2;
    var classDef2 = bin.readUshort(data, offset);
    offset += 2;
    var class1Count = bin.readUshort(data, offset);
    offset += 2;
    var class2Count = bin.readUshort(data, offset);
    offset += 2;

    tab.classDef1 = _lctf.readClassDef(data, offset0 + classDef1);
    tab.classDef2 = _lctf.readClassDef(data, offset0 + classDef2);

    tab.matrix = [];
    for (var i = 0; i < class1Count; i++) {
      var row = [];
      for (var j = 0; j < class2Count; j++) {
        var value1 = null, value2 = null;
        if (tab.valFmt1 != 0) {
          value1 = _lctf.readValueRecord(data, offset, tab.valFmt1);
          offset += ones1 * 2;
        }
        if (tab.valFmt2 != 0) {
          value2 = _lctf.readValueRecord(data, offset, tab.valFmt2);
          offset += ones2 * 2;
        }
        row.push({val1: value1, val2: value2});
      }
      tab.matrix.push(row);
    }
  }
  return tab;
}

module.exports = GPOS;