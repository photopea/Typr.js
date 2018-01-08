var cmap = {};
cmap.parse = function (data, offset, length) {
  data = new Uint8Array(data.buffer, offset, length);
  offset = 0;

  var offset0 = offset;
  var bin = _bin;
  var obj = {};
  var version = bin.readUshort(data, offset);
  offset += 2;
  var numTables = bin.readUshort(data, offset);
  offset += 2;

  //console.log(version, numTables);

  var offs = [];
  obj.tables = [];

  for (var i = 0; i < numTables; i++) {
    var platformID = bin.readUshort(data, offset);
    offset += 2;
    var encodingID = bin.readUshort(data, offset);
    offset += 2;
    var noffset = bin.readUint(data, offset);
    offset += 4;

    var id = "p" + platformID + "e" + encodingID;

    //console.log("cmap subtable", platformID, encodingID, noffset);

    var tind = offs.indexOf(noffset);

    if (tind == -1) {
      tind = obj.tables.length;
      var subt;
      offs.push(noffset);
      var format = bin.readUshort(data, noffset);
      if (format == 0) subt = cmap.parse0(data, noffset);
      else if (format == 4) subt = cmap.parse4(data, noffset);
      else if (format == 6) subt = cmap.parse6(data, noffset);
      else if (format == 12) subt = cmap.parse12(data, noffset);
      else console.log("unknown format: " + format, platformID, encodingID, noffset);
      obj.tables.push(subt);
    }

    if (obj[id] != null) throw "multiple tables for one platform+encoding";
    obj[id] = tind;
  }
  return obj;
}

cmap.parse0 = function (data, offset) {
  var bin = _bin;
  var obj = {};
  obj.format = bin.readUshort(data, offset);
  offset += 2;
  var len = bin.readUshort(data, offset);
  offset += 2;
  var lang = bin.readUshort(data, offset);
  offset += 2;
  obj.map = [];
  for (var i = 0; i < len - 6; i++) obj.map.push(data[offset + i]);
  return obj;
}

cmap.parse4 = function (data, offset) {
  var bin = _bin;
  var offset0 = offset;
  var obj = {};

  obj.format = bin.readUshort(data, offset);
  offset += 2;
  var length = bin.readUshort(data, offset);
  offset += 2;
  var language = bin.readUshort(data, offset);
  offset += 2;
  var segCountX2 = bin.readUshort(data, offset);
  offset += 2;
  var segCount = segCountX2 / 2;
  obj.searchRange = bin.readUshort(data, offset);
  offset += 2;
  obj.entrySelector = bin.readUshort(data, offset);
  offset += 2;
  obj.rangeShift = bin.readUshort(data, offset);
  offset += 2;
  obj.endCount = bin.readUshorts(data, offset, segCount);
  offset += segCount * 2;
  offset += 2;
  obj.startCount = bin.readUshorts(data, offset, segCount);
  offset += segCount * 2;
  obj.idDelta = [];
  for (var i = 0; i < segCount; i++) {
    obj.idDelta.push(bin.readShort(data, offset));
    offset += 2;
  }
  obj.idRangeOffset = bin.readUshorts(data, offset, segCount);
  offset += segCount * 2;
  obj.glyphIdArray = [];
  while (offset < offset0 + length) {
    obj.glyphIdArray.push(bin.readUshort(data, offset));
    offset += 2;
  }
  return obj;
}

cmap.parse6 = function (data, offset) {
  var bin = _bin;
  var offset0 = offset;
  var obj = {};

  obj.format = bin.readUshort(data, offset);
  offset += 2;
  var length = bin.readUshort(data, offset);
  offset += 2;
  var language = bin.readUshort(data, offset);
  offset += 2;
  obj.firstCode = bin.readUshort(data, offset);
  offset += 2;
  var entryCount = bin.readUshort(data, offset);
  offset += 2;
  obj.glyphIdArray = [];
  for (var i = 0; i < entryCount; i++) {
    obj.glyphIdArray.push(bin.readUshort(data, offset));
    offset += 2;
  }

  return obj;
}

cmap.parse12 = function (data, offset) {
  var bin = _bin;
  var offset0 = offset;
  var obj = {};

  obj.format = bin.readUshort(data, offset);
  offset += 2;
  offset += 2;
  var length = bin.readUint(data, offset);
  offset += 4;
  var lang = bin.readUint(data, offset);
  offset += 4;
  var nGroups = bin.readUint(data, offset);
  offset += 4;
  obj.groups = [];

  for (var i = 0; i < nGroups; i++) {
    var off = offset + i * 12;
    var startCharCode = bin.readUint(data, off + 0);
    var endCharCode = bin.readUint(data, off + 4);
    var startGlyphID = bin.readUint(data, off + 8);
    obj.groups.push([startCharCode, endCharCode, startGlyphID]);
  }
  return obj;
}

module.exports = cmap;