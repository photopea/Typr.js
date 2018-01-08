// Require modules
var _bin = require('./bin.js')
var tabs = require('./tabs.js');

// Create Typr
var Typr = {};

Typr.parse = function (buff) {
  var bin = _bin;
  var data = new Uint8Array(buff);
  var offset = 0;

  var sfnt_version = bin.readFixed(data, offset);
  offset += 4;
  var numTables = bin.readUshort(data, offset);
  offset += 2;
  var searchRange = bin.readUshort(data, offset);
  offset += 2;
  var entrySelector = bin.readUshort(data, offset);
  offset += 2;
  var rangeShift = bin.readUshort(data, offset);
  offset += 2;

  var tags = [
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
    "GSUB"
    //"VORG",
  ];

  var obj = {_data: data};
  //console.log(sfnt_version, numTables, searchRange, entrySelector, rangeShift);

  var tabsObj = {};

  for (var i = 0; i < numTables; i++) {
    var tag = bin.readASCII(data, offset, 4);
    offset += 4;
    var checkSum = bin.readUint(data, offset);
    offset += 4;
    var toffset = bin.readUint(data, offset);
    offset += 4;
    var length = bin.readUint(data, offset);
    offset += 4;
    tabsObj[tag] = {offset: toffset, length: length};

    //if(tags.indexOf(tag)==-1) console.log("unknown tag", tag);
  }

  for (var i = 0; i < tags.length; i++) {
    var t = tags[i];
    //console.log(t);
    //if(tabsObj[t]) console.log(t, tabs[t].offset, tabs[t].length);
    if (tabsObj[t]) obj[t.trim()] = tabs[t.trim()].parse(data, tabsObj[t].offset, tabsObj[t].length, obj);
  }

  return obj;
}

module.exports = Typr;

window.Typr = Typr;