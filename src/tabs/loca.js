

Typr.loca = {};
Typr.loca.parse = function(data, offset, length, font)
{
	var bin = Typr._bin;
	var obj = [];
	
	var ver = font.head.indexToLocFormat;
	
	for(var i=0; i<font.maxp.numGlyphs+1; i++)
	{
		if(ver==0) { obj.push(bin.readUshort(data, offset)*2); offset += 2; }
		if(ver==1) { obj.push(bin.readUint  (data, offset)  ); offset += 4; }
	}
	return obj;
}
