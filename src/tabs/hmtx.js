var hmtx = {};
hmtx.parse = function (data, offset, length, font) {
  var bin = _bin;
  var obj = {};

  obj.aWidth = [];
  obj.lsBearing = [];

  var aw = 0, lsb = 0;

  for (var i = 0; i < font.maxp.numGlyphs; i++) {
    if (i < font.hhea.numberOfHMetrics) {
      aw = bin.readUshort(data, offset);
      offset += 2;
      lsb = bin.readShort(data, offset);
      offset += 2;
    }
    obj.aWidth.push(aw);
    obj.lsBearing.push(lsb);
  }

  return obj;
}

module.exports = hmtx;