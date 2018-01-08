var loca = {};
loca.parse = function (data, offset, length, font) {
  var bin = _bin;
  var obj = [];

  var ver = font.head.indexToLocFormat;
  //console.log("loca", ver, length, 4*font.maxp.numGlyphs);
  var len = font.maxp.numGlyphs + 1;

  if (ver == 0) for (var i = 0; i < len; i++) obj.push(bin.readUshort(data, offset + (i << 1)) << 1);
  if (ver == 1) for (var i = 0; i < len; i++) obj.push(bin.readUint(data, offset + (i << 2)));

  return obj;
}

module.exports = loca;