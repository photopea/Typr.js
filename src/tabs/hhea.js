var hhea = {};
hhea.parse = function (data, offset, length) {
  var bin = _bin;
  var obj = {};
  var tableVersion = bin.readFixed(data, offset);
  offset += 4;
  obj.ascender = bin.readShort(data, offset);
  offset += 2;
  obj.descender = bin.readShort(data, offset);
  offset += 2;
  obj.lineGap = bin.readShort(data, offset);
  offset += 2;

  obj.advanceWidthMax = bin.readUshort(data, offset);
  offset += 2;
  obj.minLeftSideBearing = bin.readShort(data, offset);
  offset += 2;
  obj.minRightSideBearing = bin.readShort(data, offset);
  offset += 2;
  obj.xMaxExtent = bin.readShort(data, offset);
  offset += 2;

  obj.caretSlopeRise = bin.readShort(data, offset);
  offset += 2;
  obj.caretSlopeRun = bin.readShort(data, offset);
  offset += 2;
  obj.caretOffset = bin.readShort(data, offset);
  offset += 2;

  offset += 4 * 2;

  obj.metricDataFormat = bin.readShort(data, offset);
  offset += 2;
  obj.numberOfHMetrics = bin.readUshort(data, offset);
  offset += 2;
  return obj;
}

module.exports = hhea;