Typr.SVG = {};
Typr.SVG.parse = function(data, offset, length)
{
  var bin = Typr._bin;
  var obj = { entries: []};

  var offset0 = offset;

  var tableVersion = bin.readUshort(data, offset);  offset += 2;
  var svgDocIndexOffset = bin.readUint(data, offset);  offset += 4;
  var reserved = bin.readUint(data, offset); offset += 4;

  offset = svgDocIndexOffset + offset0;

  var numEntries = bin.readUshort(data, offset);  offset += 2;

  for(var i=0; i<numEntries; i++)
  {
    var startGlyphID = bin.readUshort(data, offset);  offset += 2;
    var endGlyphID = bin.readUshort(data, offset);  offset += 2;
    var svgDocOffset = bin.readUint(data, offset);  offset += 4;
    var svgDocLength = bin.readUint(data, offset); offset += 4;

    var svg = bin.readASCII(data, offset0 + svgDocOffset + svgDocIndexOffset, svgDocLength);

    for(var f=startGlyphID; f<=endGlyphID; f++){
      obj.entries[f] = svg;
    }
  }

  return obj;

}
