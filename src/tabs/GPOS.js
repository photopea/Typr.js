

Typr.GPOS = {};
Typr.GPOS.parse = function(data, offset, length, font)
{
	var bin = Typr._bin;
	var obj = {};
	var offset0 = offset;
	var tableVersion = bin.readFixed(data, offset);  offset += 4;
	
	var offScriptList  = bin.readUshort(data, offset);  offset += 2;
	var offFeatureList = bin.readUshort(data, offset);  offset += 2;
	var offLookupList  = bin.readUshort(data, offset);  offset += 2;
	
	
	obj.scriptList  = Typr.GPOS.readScriptList (data, offset0 + offScriptList);
	obj.featureList = Typr.GPOS.readFeatureList(data, offset0 + offFeatureList);
	obj.lookupList  = Typr.GPOS.readLookupList (data, offset0 + offLookupList);
	
	return obj;
}

Typr.GPOS.readLookupList = function(data, offset)
{
	var bin = Typr._bin;
	var offset0 = offset;
	var obj = [];
	
	var count = bin.readUshort(data, offset);  offset+=2;
	for(var i=0; i<count; i++) 
	{
		var noff = bin.readUshort(data, offset);  offset+=2;
		obj.push(Typr.GPOS.readLookupTable(data, offset0 + noff));
	}
	return obj;
}

Typr.GPOS.readLookupTable = function(data, offset)
{
	//console.log("Parsing lookup table", offset);
	var bin = Typr._bin;
	var offset0 = offset;
	var obj = {tabs:[]};
	
	obj.type = bin.readUshort(data, offset);  offset+=2;
	obj.flag = bin.readUshort(data, offset);  offset+=2;
	var tcount = bin.readUshort(data, offset);  offset+=2;
	
	for(var i=0; i<tcount; i++)
	{
		var noff = bin.readUshort(data, offset);  offset+=2;
		
		var tab;
		if(obj.type==2) tab = Typr.GPOS.readPairPosTable(data, noff+offset0);//{  console.log("---", noff+offset0);  tab = Typr.GPOS.parseCoverage(data, noff + offset0);  }
		
		obj.tabs.push(tab);
	}
	//var count = bin.readUshort(data, offset);  offset+=2;
	return obj;
}

Typr.GPOS.numOfOnes = function(n)
{
	var num = 0;
	for(var i=0; i<32; i++) if(((n>>>i)&1) != 0) num++;
	return num;
}

Typr.GPOS.readPairPosTable = function(data, offset)
{
	var bin = Typr._bin;
	var offset0 = offset;
	var tab = {};
	
	tab.format  = bin.readUshort(data, offset);  offset+=2;
	var covOff  = bin.readUshort(data, offset);  offset+=2;
	tab.coverage = Typr.GPOS.readCoverage(data, covOff+offset0);
	tab.valFmt1 = bin.readUshort(data, offset);  offset+=2;
	tab.valFmt2 = bin.readUshort(data, offset);  offset+=2;
	var ones1 = Typr.GPOS.numOfOnes(tab.valFmt1);
	var ones2 = Typr.GPOS.numOfOnes(tab.valFmt2);
	if(tab.format==1)
	{
		tab.pairsets = [];
		var count = bin.readUshort(data, offset);  offset+=2;
		
		for(var i=0; i<count; i++)
		{
			var psoff = bin.readUshort(data, offset);  offset+=2;
			psoff += offset0;
			var pvcount = bin.readUshort(data, psoff);  psoff+=2;
			var arr = [];
			for(var j=0; j<pvcount; j++)
			{
				var gid2 = bin.readUshort(data, psoff);  psoff+=2;
				var value1, value2;
				if(tab.valFmt1!=0) {  value1 = Typr.GPOS.readValueRecord(data, psoff, tab.valFmt1);  psoff+=ones1*2;  }
				if(tab.valFmt2!=0) {  value2 = Typr.GPOS.readValueRecord(data, psoff, tab.valFmt2);  psoff+=ones2*2;  }
				arr.push({gid2:gid2, val1:value1, val2:value2});
			}
			tab.pairsets.push(arr);
		}
	}
	if(tab.format==2)
	{
		var classDef1 = bin.readUshort(data, offset);  offset+=2;
		var classDef2 = bin.readUshort(data, offset);  offset+=2;
		var class1Count = bin.readUshort(data, offset);  offset+=2;
		var class2Count = bin.readUshort(data, offset);  offset+=2;
		
		tab.classDef1 = Typr.GPOS.readClassDef(data, offset0 + classDef1);
		tab.classDef2 = Typr.GPOS.readClassDef(data, offset0 + classDef2);
		
		tab.matrix = [];
		for(var i=0; i<class1Count; i++)
		{
			var row = [];
			for(var j=0; j<class2Count; j++)
			{
				var value1 = null, value2 = null;
				if(tab.valFmt1!=0) { value1 = Typr.GPOS.readValueRecord(data, offset, tab.valFmt1);  offset+=ones1*2; }
				if(tab.valFmt2!=0) { value2 = Typr.GPOS.readValueRecord(data, offset, tab.valFmt2);  offset+=ones2*2; }
				row.push({val1:value1, val2:value2});
			}
			tab.matrix.push(row);
		}
	}
	return tab;
}

Typr.GPOS.readClassDef = function(data, offset)
{
	var bin = Typr._bin;
	var obj = { start:[], end:[], class:[] };
	var format = bin.readUshort(data, offset);  offset+=2;
	if(format==1) 
	{
		var startGlyph  = bin.readUshort(data, offset);  offset+=2;
		var glyphCount  = bin.readUshort(data, offset);  offset+=2;
		for(var i=0; i<glyphCount; i++)
		{
			obj.start.push(startGlyph+i);
			obj.end  .push(startGlyph+i);
			obj.class.push(bin.readUshort(data, offset));  offset+=2;
		}
	}
	if(format==2)
	{
		var count = bin.readUshort(data, offset);  offset+=2;
		for(var i=0; i<count; i++)
		{
			obj.start.push(bin.readUshort(data, offset));  offset+=2;
			obj.end  .push(bin.readUshort(data, offset));  offset+=2;
			obj.class.push(bin.readUshort(data, offset));  offset+=2;
		}
	}
	return obj;
}

Typr.GPOS.readValueRecord = function(data, offset, valFmt)
{
	var bin = Typr._bin;
	var arr = [];
	arr.push( (valFmt&1) ? bin.readShort(data, offset) : 0 );  offset += (valFmt&1) ? 2 : 0;
	arr.push( (valFmt&2) ? bin.readShort(data, offset) : 0 );  offset += (valFmt&2) ? 2 : 0;
	arr.push( (valFmt&4) ? bin.readShort(data, offset) : 0 );  offset += (valFmt&4) ? 2 : 0;
	arr.push( (valFmt&8) ? bin.readShort(data, offset) : 0 );  offset += (valFmt&8) ? 2 : 0;
	return arr;
}

Typr.GPOS.readCoverage = function(data, offset)
{
	var bin = Typr._bin;
	var tab = [];
	var format = bin.readUshort(data, offset);  offset+=2;
	var count  = bin.readUshort(data, offset);  offset+=2;
	//console.log("parsing coverage", offset-4, format, count);
	if(format==1)  
	{
		for(var i=0; i<count; i++)  tab.push(bin.readUshort(data, offset+i*2)); 
	}
	if(format==2)  
	{
		for(var i=0; i<count; i++) 
		{
			var start = bin.readUshort(data, offset);  offset+=2;
			var end   = bin.readUshort(data, offset);  offset+=2;
			var index = bin.readUshort(data, offset);  offset+=2;
			for(var j=start; j<=end; j++) tab[index++] = j;
		}
	}
	return tab;
}

Typr.GPOS.readFeatureList = function(data, offset)
{
	var bin = Typr._bin;
	var offset0 = offset;
	var obj = [];
	
	var count = bin.readUshort(data, offset);  offset+=2;
	
	for(var i=0; i<count; i++)
	{
		var tag = bin.readASCII(data, offset, 4);  offset+=4;
		var noff = bin.readUshort(data, offset);  offset+=2;
		obj.push({tag: tag.trim(), tab:Typr.GPOS.readFeatureTable(data, offset0 + noff)});
	}
	return obj;
}

Typr.GPOS.readFeatureTable = function(data, offset)
{
	var bin = Typr._bin;
	
	var featureParams = bin.readUshort(data, offset);  offset+=2;	// = 0
	var lookupCount = bin.readUshort(data, offset);  offset+=2;
	
	var indices = [];
	for(var i=0; i<lookupCount; i++) indices.push(bin.readUshort(data, offset+2*i));
	return indices;
}


Typr.GPOS.readScriptList = function(data, offset)
{
	var bin = Typr._bin;
	var offset0 = offset;
	var obj = {};
	
	var count = bin.readUshort(data, offset);  offset+=2;
	
	for(var i=0; i<count; i++)
	{
		var tag = bin.readASCII(data, offset, 4);  offset+=4;
		var noff = bin.readUshort(data, offset);  offset+=2;
		obj[tag.trim()] = Typr.GPOS.readScriptTable(data, offset0 + noff);
	}
	return obj;
}

Typr.GPOS.readScriptTable = function(data, offset)
{
	var bin = Typr._bin;
	var offset0 = offset;
	var obj = {};
	
	var defLangSysOff = bin.readUshort(data, offset);  offset+=2;
	obj.default = Typr.GPOS.readLangSysTable(data, offset0 + defLangSysOff);
	
	var langSysCount = bin.readUshort(data, offset);  offset+=2;
	
	for(var i=0; i<langSysCount; i++)
	{
		var tag = bin.readASCII(data, offset, 4);  offset+=4;
		var langSysOff = bin.readUshort(data, offset);  offset+=2;
		obj[tag.trim()] = Typr.GPOS.readLangSysTable(data, offset0 + langSysOff);
	}
	return obj;
}

Typr.GPOS.readLangSysTable = function(data, offset)
{
	var bin = Typr._bin;
	var obj = {};
	
	var lookupOrder = bin.readUshort(data, offset);  offset+=2;
	if(lookupOrder!=0)  throw "lookupOrder not 0";
	obj.reqFeature = bin.readUshort(data, offset);  offset+=2;
	//if(obj.reqFeature != 0xffff) throw "reqFeatureIndex != 0xffff";
	
	var featureCount = bin.readUshort(data, offset);  offset+=2;
	obj.features = [];
	for(var i=0; i<featureCount; i++) obj.features.push(bin.readUshort(data, offset+2*i));
	return obj;
}