var kern = {};
kern.parse = function (data, offset, length, font) {
  var bin = _bin;

  var version = bin.readUshort(data, offset);
  offset += 2;
  if (version == 1) return kern.parseV1(data, offset - 2, length, font);
  var nTables = bin.readUshort(data, offset);
  offset += 2;

  var map = {glyph1: [], rval: []};
  for (var i = 0; i < nTables; i++) {
    offset += 2;	// skip version
    var length = bin.readUshort(data, offset);
    offset += 2;
    var coverage = bin.readUshort(data, offset);
    offset += 2;
    var format = coverage >>> 8;
    /* I have seen format 128 once, that's why I do */
    format &= 0xf;
    if (format == 0) offset = kern.readFormat0(data, offset, map);
    else throw "unknown kern table format: " + format;
  }
  return map;
}

kern.parseV1 = function (data, offset, length, font) {
  var bin = _bin;

  var version = bin.readFixed(data, offset);
  offset += 4;
  var nTables = bin.readUint(data, offset);
  offset += 4;

  var map = {glyph1: [], rval: []};
  for (var i = 0; i < nTables; i++) {
    var length = bin.readUint(data, offset);
    offset += 4;
    var coverage = bin.readUshort(data, offset);
    offset += 2;
    var tupleIndex = bin.readUshort(data, offset);
    offset += 2;
    var format = coverage >>> 8;
    /* I have seen format 128 once, that's why I do */
    format &= 0xf;
    if (format == 0) offset = kern.readFormat0(data, offset, map);
    else throw "unknown kern table format: " + format;
  }
  return map;
}

kern.readFormat0 = function (data, offset, map) {
  var bin = _bin;
  var pleft = -1;
  var nPairs = bin.readUshort(data, offset);
  offset += 2;
  var searchRange = bin.readUshort(data, offset);
  offset += 2;
  var entrySelector = bin.readUshort(data, offset);
  offset += 2;
  var rangeShift = bin.readUshort(data, offset);
  offset += 2;
  for (var j = 0; j < nPairs; j++) {
    var left = bin.readUshort(data, offset);
    offset += 2;
    var right = bin.readUshort(data, offset);
    offset += 2;
    var value = bin.readShort(data, offset);
    offset += 2;
    if (left != pleft) {
      map.glyph1.push(left);
      map.rval.push({glyph2: [], vals: []})
    }
    var rval = map.rval[map.rval.length - 1];
    rval.glyph2.push(right);
    rval.vals.push(value);
    pleft = left;
  }
  return offset;
}

module.exports = kern;