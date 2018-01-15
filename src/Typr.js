(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(["exports"], factory);
  } else if (typeof exports !== "undefined") {
    factory(exports);
  } else {
    var mod = {
      exports: {}
    };
    factory(mod.exports);
    global.Typr = mod.exports.default;
  }
})(this, function (exports) {
  'use strict';

var Typr = {};

Typr.parse = function(buff)
{
	var bin = Typr._bin;
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
	
	var obj = {_data:data};
	//console.log(sfnt_version, numTables, searchRange, entrySelector, rangeShift);
	
	var tabs = {};
	
	for(var i=0; i<numTables; i++)
	{
		var tag = bin.readASCII(data, offset, 4);   offset += 4;
		var checkSum = bin.readUint(data, offset);  offset += 4;
		var toffset = bin.readUint(data, offset);   offset += 4;
		var length = bin.readUint(data, offset);    offset += 4;
		tabs[tag] = {offset:toffset, length:length};
		
		//if(tags.indexOf(tag)==-1) console.log("unknown tag", tag);
	}
	
	for(var i=0; i< tags.length; i++)
	{
		var t = tags[i];
		//console.log(t);
		//if(tabs[t]) console.log(t, tabs[t].offset, tabs[t].length);
		if(tabs[t]) obj[t.trim()] = Typr[t.trim()].parse(data, tabs[t].offset, tabs[t].length, obj);
	}
	
	return obj;
}

Typr._tabOffset = function(data, tab)
{
	var bin = Typr._bin;
	var numTables = bin.readUshort(data, 4);
	var offset = 12;
	for(var i=0; i<numTables; i++)
	{
		var tag = bin.readASCII(data, offset, 4);   offset += 4;
		var checkSum = bin.readUint(data, offset);  offset += 4;
		var toffset = bin.readUint(data, offset);   offset += 4;
		var length = bin.readUint(data, offset);    offset += 4;
		if(tag==tab) return toffset;
	}
	return 0;
}





Typr._bin = {
	readFixed : function(data, o)
	{
		return ((data[o]<<8) | data[o+1]) +  (((data[o+2]<<8)|data[o+3])/(256*256+4));
	},
	readF2dot14 : function(data, o)
	{
		var num = Typr._bin.readShort(data, o);
		return num / 16384;
		
		var intg = (num >> 14), frac = ((num & 0x3fff)/(0x3fff+1));
		return (intg>0) ? (intg+frac) : (intg-frac);
	},
	readInt : function(buff, p)
	{
		//if(p>=buff.length) throw "error";
		var a = Typr._bin.t.uint8;
		a[0] = buff[p+3];
		a[1] = buff[p+2];
		a[2] = buff[p+1];
		a[3] = buff[p];
		return Typr._bin.t.int32[0];
	},
	
	readInt8 : function(buff, p)
	{
		//if(p>=buff.length) throw "error";
		var a = Typr._bin.t.uint8;
		a[0] = buff[p];
		return Typr._bin.t.int8[0];
	},
	readShort : function(buff, p)
	{
		//if(p>=buff.length) throw "error";
		var a = Typr._bin.t.uint8;
		a[1] = buff[p]; a[0] = buff[p+1];
		return Typr._bin.t.int16[0];
	},
	readUshort : function(buff, p)
	{
		//if(p>=buff.length) throw "error";
		return (buff[p]<<8) | buff[p+1];
	},
	readUshorts : function(buff, p, len)
	{
		var arr = [];
		for(var i=0; i<len; i++) arr.push(Typr._bin.readUshort(buff, p+i*2));
		return arr;
	},
	readUint : function(buff, p)
	{
		//if(p>=buff.length) throw "error";
		var a = Typr._bin.t.uint8;
		a[3] = buff[p];  a[2] = buff[p+1];  a[1] = buff[p+2];  a[0] = buff[p+3];
		return Typr._bin.t.uint32[0];
	},
	readUint64 : function(buff, p)
	{
		//if(p>=buff.length) throw "error";
		return (Typr._bin.readUint(buff, p)*(0xffffffff+1)) + Typr._bin.readUint(buff, p+4);
	},
	readASCII : function(buff, p, l)	// l : length in Characters (not Bytes)
	{
		//if(p>=buff.length) throw "error";
		var s = "";
		for(var i = 0; i < l; i++) s += String.fromCharCode(buff[p+i]);
		return s;
	},
	readUnicode : function(buff, p, l)
	{
		//if(p>=buff.length) throw "error";
		var s = "";
		for(var i = 0; i < l; i++)	
		{
			var c = (buff[p++]<<8) | buff[p++];
			s += String.fromCharCode(c);
		}
		return s;
	},
	readBytes : function(buff, p, l)
	{
		//if(p>=buff.length) throw "error";
		var arr = [];
		for(var i=0; i<l; i++) arr.push(buff[p+i]);
		return arr;
	},
	readASCIIArray : function(buff, p, l)	// l : length in Characters (not Bytes)
	{
		//if(p>=buff.length) throw "error";
		var s = [];
		for(var i = 0; i < l; i++)	
			s.push(String.fromCharCode(buff[p+i]));
		return s;
	}
};

Typr._bin.t = {
	buff: new ArrayBuffer(8),
};
Typr._bin.t.int8   = new Int8Array  (Typr._bin.t.buff);
Typr._bin.t.uint8  = new Uint8Array (Typr._bin.t.buff);
Typr._bin.t.int16  = new Int16Array (Typr._bin.t.buff);
Typr._bin.t.uint16 = new Uint16Array(Typr._bin.t.buff);
Typr._bin.t.int32  = new Int32Array (Typr._bin.t.buff);
Typr._bin.t.uint32 = new Uint32Array(Typr._bin.t.buff);





// OpenType Layout Common Table Formats

Typr._lctf = {};

Typr._lctf.parse = function(data, offset, length, font, subt)
{
	var bin = Typr._bin;
	var obj = {};
	var offset0 = offset;
	var tableVersion = bin.readFixed(data, offset);  offset += 4;
	
	var offScriptList  = bin.readUshort(data, offset);  offset += 2;
	var offFeatureList = bin.readUshort(data, offset);  offset += 2;
	var offLookupList  = bin.readUshort(data, offset);  offset += 2;
	
	
	obj.scriptList  = Typr._lctf.readScriptList (data, offset0 + offScriptList);
	obj.featureList = Typr._lctf.readFeatureList(data, offset0 + offFeatureList);
	obj.lookupList  = Typr._lctf.readLookupList (data, offset0 + offLookupList, subt);
	
	return obj;
}

Typr._lctf.readLookupList = function(data, offset, subt)
{
	var bin = Typr._bin;
	var offset0 = offset;
	var obj = [];
	var count = bin.readUshort(data, offset);  offset+=2;
	for(var i=0; i<count; i++) 
	{
		var noff = bin.readUshort(data, offset);  offset+=2;
		var lut = Typr._lctf.readLookupTable(data, offset0 + noff, subt);
		obj.push(lut);
	}
	return obj;
}

Typr._lctf.readLookupTable = function(data, offset, subt)
{
	//console.log("Parsing lookup table", offset);
	var bin = Typr._bin;
	var offset0 = offset;
	var obj = {tabs:[]};
	
	obj.ltype = bin.readUshort(data, offset);  offset+=2;
	obj.flag  = bin.readUshort(data, offset);  offset+=2;
	var cnt   = bin.readUshort(data, offset);  offset+=2;
	
	for(var i=0; i<cnt; i++)
	{
		var noff = bin.readUshort(data, offset);  offset+=2;
		var tab = subt(data, obj.ltype, offset0 + noff);
		//console.log(obj.type, tab);
		obj.tabs.push(tab);
	}
	return obj;
}

Typr._lctf.numOfOnes = function(n)
{
	var num = 0;
	for(var i=0; i<32; i++) if(((n>>>i)&1) != 0) num++;
	return num;
}

Typr._lctf.readClassDef = function(data, offset)
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

Typr._lctf.readValueRecord = function(data, offset, valFmt)
{
	var bin = Typr._bin;
	var arr = [];
	arr.push( (valFmt&1) ? bin.readShort(data, offset) : 0 );  offset += (valFmt&1) ? 2 : 0;
	arr.push( (valFmt&2) ? bin.readShort(data, offset) : 0 );  offset += (valFmt&2) ? 2 : 0;
	arr.push( (valFmt&4) ? bin.readShort(data, offset) : 0 );  offset += (valFmt&4) ? 2 : 0;
	arr.push( (valFmt&8) ? bin.readShort(data, offset) : 0 );  offset += (valFmt&8) ? 2 : 0;
	return arr;
}

Typr._lctf.readCoverage = function(data, offset)
{
	var bin = Typr._bin;
	var cvg = {};
	cvg.fmt   = bin.readUshort(data, offset);  offset+=2;
	var count = bin.readUshort(data, offset);  offset+=2;
	//console.log("parsing coverage", offset-4, format, count);
	if(cvg.fmt==1) cvg.tab = bin.readUshorts(data, offset, count); 
	if(cvg.fmt==2) cvg.tab = bin.readUshorts(data, offset, count*3);
	return cvg;
}

Typr._lctf.coverageIndex = function(cvg, val)
{
	var tab = cvg.tab;
	if(cvg.fmt==1) return tab.indexOf(val);
	
	for(var i=0; i<tab.length; i+=3)
	{
		var start = tab[i], end = tab[i+1], index = tab[i+2];
		if(start<=val && val<=end) return index + (val-start);
	}
	return -1;
}

Typr._lctf.readFeatureList = function(data, offset)
{
	var bin = Typr._bin;
	var offset0 = offset;
	var obj = [];
	
	var count = bin.readUshort(data, offset);  offset+=2;
	
	for(var i=0; i<count; i++)
	{
		var tag = bin.readASCII(data, offset, 4);  offset+=4;
		var noff = bin.readUshort(data, offset);  offset+=2;
		obj.push({tag: tag.trim(), tab:Typr._lctf.readFeatureTable(data, offset0 + noff)});
	}
	return obj;
}

Typr._lctf.readFeatureTable = function(data, offset)
{
	var bin = Typr._bin;
	
	var featureParams = bin.readUshort(data, offset);  offset+=2;	// = 0
	var lookupCount = bin.readUshort(data, offset);  offset+=2;
	
	var indices = [];
	for(var i=0; i<lookupCount; i++) indices.push(bin.readUshort(data, offset+2*i));
	return indices;
}


Typr._lctf.readScriptList = function(data, offset)
{
	var bin = Typr._bin;
	var offset0 = offset;
	var obj = {};
	
	var count = bin.readUshort(data, offset);  offset+=2;
	
	for(var i=0; i<count; i++)
	{
		var tag = bin.readASCII(data, offset, 4);  offset+=4;
		var noff = bin.readUshort(data, offset);  offset+=2;
		obj[tag.trim()] = Typr._lctf.readScriptTable(data, offset0 + noff);
	}
	return obj;
}

Typr._lctf.readScriptTable = function(data, offset)
{
	var bin = Typr._bin;
	var offset0 = offset;
	var obj = {};
	
	var defLangSysOff = bin.readUshort(data, offset);  offset+=2;
	obj.default = Typr._lctf.readLangSysTable(data, offset0 + defLangSysOff);
	
	var langSysCount = bin.readUshort(data, offset);  offset+=2;
	
	for(var i=0; i<langSysCount; i++)
	{
		var tag = bin.readASCII(data, offset, 4);  offset+=4;
		var langSysOff = bin.readUshort(data, offset);  offset+=2;
		obj[tag.trim()] = Typr._lctf.readLangSysTable(data, offset0 + langSysOff);
	}
	return obj;
}

Typr._lctf.readLangSysTable = function(data, offset)
{
	var bin = Typr._bin;
	var obj = {};
	
	var lookupOrder = bin.readUshort(data, offset);  offset+=2;
	//if(lookupOrder!=0)  throw "lookupOrder not 0";
	obj.reqFeature = bin.readUshort(data, offset);  offset+=2;
	//if(obj.reqFeature != 0xffff) throw "reqFeatureIndex != 0xffff";
	
	//console.log(lookupOrder, obj.reqFeature);
	
	var featureCount = bin.readUshort(data, offset);  offset+=2;
	obj.features = bin.readUshorts(data, offset, featureCount);
	return obj;
}

	Typr.CFF = {};
	Typr.CFF.parse = function(data, offset, length)
	{
		var bin = Typr._bin;
		
		data = new Uint8Array(data.buffer, offset, length);
		offset = 0;
		
		// Header
		var major = data[offset];  offset++;
		var minor = data[offset];  offset++;
		var hdrSize = data[offset];  offset++;
		var offsize = data[offset];  offset++;
		//console.log(major, minor, hdrSize, offsize);
		
		// Name INDEX
		var ninds = [];
		offset = Typr.CFF.readIndex(data, offset, ninds);
		var names = [];
		
		for(var i=0; i<ninds.length-1; i++) names.push(bin.readASCII(data, offset+ninds[i], ninds[i+1]-ninds[i]));
		//console.log(names);
		offset += ninds[ninds.length-1];
		
		
		// Top DICT INDEX
		var tdinds = [];
		offset = Typr.CFF.readIndex(data, offset, tdinds);
		// Top DICT Data
		var topDicts = [];
		for(var i=0; i<tdinds.length-1; i++) topDicts.push( Typr.CFF.readDict(data, offset+tdinds[i], offset+tdinds[i+1]) );
		offset += tdinds[tdinds.length-1];
		var topdict = topDicts[0];
		//console.log(topdict);
		
		// String INDEX
		var sinds = [];
		offset = Typr.CFF.readIndex(data, offset, sinds);
		// String Data
		var strings = [];
		for(var i=0; i<sinds.length-1; i++) strings.push(bin.readASCII(data, offset+sinds[i], sinds[i+1]-sinds[i]));
		offset += sinds[sinds.length-1];
		
		// Global Subr INDEX  (subroutines)		
		Typr.CFF.readSubrs(data, offset, topdict);
		
		// charstrings
		if(topdict.CharStrings)
		{
			offset = topdict.CharStrings;
			var sinds = [];
			offset = Typr.CFF.readIndex(data, offset, sinds);
			
			var cstr = [];
			for(var i=0; i<sinds.length-1; i++) cstr.push(bin.readBytes(data, offset+sinds[i], sinds[i+1]-sinds[i]));
			//offset += sinds[sinds.length-1];
			topdict.CharStrings = cstr;
			//console.log(topdict.CharStrings);
		}
		
		// Encoding
		if(topdict.Encoding) topdict.Encoding = Typr.CFF.readEncoding(data, topdict.Encoding, topdict.CharStrings.length);
		
		// charset
		if(topdict.charset ) topdict.charset  = Typr.CFF.readCharset (data, topdict.charset , topdict.CharStrings.length);
		
		if(topdict.Private)
		{
			offset = topdict.Private[1];
			topdict.Private = Typr.CFF.readDict(data, offset, offset+topdict.Private[0]);
			if(topdict.Private.Subrs)  Typr.CFF.readSubrs(data, offset+topdict.Private.Subrs, topdict.Private);
		}
		
		var obj = {};
		for(var p in topdict)
		{
			if(["FamilyName", "FullName", "Notice", "version", "Copyright"].indexOf(p) != -1)  obj[p] = strings[topdict[p] -426 + 35 ];
			else obj[p] = topdict[p];
		}
		//console.log(obj);
		return obj;
	}
	
	Typr.CFF.readSubrs = function(data, offset, obj)
	{
		var bin = Typr._bin;
		var gsubinds = [];
		offset = Typr.CFF.readIndex(data, offset, gsubinds);
		
		var bias, nSubrs = gsubinds.length;
		if (false) bias = 0;
		else if (nSubrs <  1240) bias = 107;
		else if (nSubrs < 33900) bias = 1131;
		else bias = 32768;
		obj.Bias = bias;
		
		obj.Subrs = [];
		for(var i=0; i<gsubinds.length-1; i++) obj.Subrs.push(bin.readBytes(data, offset+gsubinds[i], gsubinds[i+1]-gsubinds[i]));
		//offset += gsubinds[gsubinds.length-1];
	}
	
	Typr.CFF.tableSE = [
      0,   0,   0,   0,   0,   0,   0,   0,
      0,   0,   0,   0,   0,   0,   0,   0,
      0,   0,   0,   0,   0,   0,   0,   0,
      0,   0,   0,   0,   0,   0,   0,   0,
      1,   2,   3,   4,   5,   6,   7,   8,
      9,  10,  11,  12,  13,  14,  15,  16,
     17,  18,  19,  20,  21,  22,  23,  24,
     25,  26,  27,  28,  29,  30,  31,  32,
     33,  34,  35,  36,  37,  38,  39,  40,
     41,  42,  43,  44,  45,  46,  47,  48,
     49,  50,  51,  52,  53,  54,  55,  56,
     57,  58,  59,  60,  61,  62,  63,  64,
     65,  66,  67,  68,  69,  70,  71,  72,
     73,  74,  75,  76,  77,  78,  79,  80,
     81,  82,  83,  84,  85,  86,  87,  88,
     89,  90,  91,  92,  93,  94,  95,   0,
      0,   0,   0,   0,   0,   0,   0,   0,
      0,   0,   0,   0,   0,   0,   0,   0,
      0,   0,   0,   0,   0,   0,   0,   0,
      0,   0,   0,   0,   0,   0,   0,   0,
      0,  96,  97,  98,  99, 100, 101, 102,
    103, 104, 105, 106, 107, 108, 109, 110,
      0, 111, 112, 113, 114,   0, 115, 116,
    117, 118, 119, 120, 121, 122,   0, 123,
      0, 124, 125, 126, 127, 128, 129, 130,
    131,   0, 132, 133,   0, 134, 135, 136,
    137,   0,   0,   0,   0,   0,   0,   0,
      0,   0,   0,   0,   0,   0,   0,   0,
      0, 138,   0, 139,   0,   0,   0,   0,
    140, 141, 142, 143,   0,   0,   0,   0,
      0, 144,   0,   0,   0, 145,   0,   0,
    146, 147, 148, 149,   0,   0,   0,   0
  ];
  
	Typr.CFF.glyphByUnicode = function(cff, code)
	{
		for(var i=0; i<cff.charset.length; i++) if(cff.charset[i]==code) return i;
		return -1;
	}
	
	Typr.CFF.glyphBySE = function(cff, charcode)	// glyph by standard encoding
	{
		if ( charcode < 0 || charcode > 255 ) return -1;
		return Typr.CFF.glyphByUnicode(cff, Typr.CFF.tableSE[charcode]);		
	}
	
	Typr.CFF.readEncoding = function(data, offset, num)
	{
		var bin = Typr._bin;
		
		var array = ['.notdef'];
		var format = data[offset];  offset++;
		//console.log("Encoding");
		//console.log(format);
		
		if(format==0)
		{
			var nCodes = data[offset];  offset++;
			for(var i=0; i<nCodes; i++)  array.push(data[offset+i]);
		}
		/*
		else if(format==1 || format==2)
		{
			while(charset.length<num)
			{
				var first = bin.readUshort(data, offset);  offset+=2;
				var nLeft=0;
				if(format==1) {  nLeft = data[offset];  offset++;  }
				else          {  nLeft = bin.readUshort(data, offset);  offset+=2;  }
				for(var i=0; i<=nLeft; i++)  {  charset.push(first);  first++;  }
			}
		}
		*/
		else throw "error: unknown encoding format: " + format;
		
		return array;
	}

	Typr.CFF.readCharset = function(data, offset, num)
	{
		var bin = Typr._bin;
		
		var charset = ['.notdef'];
		var format = data[offset];  offset++;
		
		if(format==0)
		{
			for(var i=0; i<num; i++) 
			{
				var first = bin.readUshort(data, offset);  offset+=2;
				charset.push(first);
			}
		}
		else if(format==1 || format==2)
		{
			while(charset.length<num)
			{
				var first = bin.readUshort(data, offset);  offset+=2;
				var nLeft=0;
				if(format==1) {  nLeft = data[offset];  offset++;  }
				else          {  nLeft = bin.readUshort(data, offset);  offset+=2;  }
				for(var i=0; i<=nLeft; i++)  {  charset.push(first);  first++;  }
			}
		}
		else throw "error: format: " + format;
		
		return charset;
	}

	Typr.CFF.readIndex = function(data, offset, inds)
	{
		var bin = Typr._bin;
		
		var count = bin.readUshort(data, offset);  offset+=2;
		var offsize = data[offset];  offset++;
		
		if     (offsize==1) for(var i=0; i<count+1; i++) inds.push( data[offset+i] );
		else if(offsize==2) for(var i=0; i<count+1; i++) inds.push( bin.readUshort(data, offset+i*2) );
		else if(offsize==3) for(var i=0; i<count+1; i++) inds.push( bin.readUint  (data, offset+i*3 - 1) & 0x00ffffff );
		else if(count!=0) throw "unsupported offset size: " + offsize + ", count: " + count;
		
		offset += (count+1)*offsize;
		return offset-1;
	}
	
	Typr.CFF.getCharString = function(data, offset, o)
	{
		var bin = Typr._bin;
		
		var b0 = data[offset], b1 = data[offset+1], b2 = data[offset+2], b3 = data[offset+3], b4=data[offset+4];
		var vs = 1;
		var op=null, val=null;
		// operand
		if(b0<=20) { op = b0;  vs=1;  }
		if(b0==12) { op = b0*100+b1;  vs=2;  }
		//if(b0==19 || b0==20) { op = b0/*+" "+b1*/;  vs=2; }
		if(21 <=b0 && b0<= 27) { op = b0;  vs=1; }
		if(b0==28) { val = bin.readShort(data,offset+1);  vs=3; }
		if(29 <=b0 && b0<= 31) { op = b0;  vs=1; }
		if(32 <=b0 && b0<=246) { val = b0-139;  vs=1; }
		if(247<=b0 && b0<=250) { val = (b0-247)*256+b1+108;  vs=2; }
		if(251<=b0 && b0<=254) { val =-(b0-251)*256-b1-108;  vs=2; }
		if(b0==255) {  val = bin.readInt(data, offset+1)/0xffff;  vs=5;   }
		
		o.val = val!=null ? val : "o"+op;
		o.size = vs;
	}
	
	Typr.CFF.readCharString = function(data, offset, length)
	{
		var end = offset + length;
		var bin = Typr._bin;
		var arr = [];
		
		while(offset<end)
		{
			var b0 = data[offset], b1 = data[offset+1], b2 = data[offset+2], b3 = data[offset+3], b4=data[offset+4];
			var vs = 1;
			var op=null, val=null;
			// operand
			if(b0<=20) { op = b0;  vs=1;  }
			if(b0==12) { op = b0*100+b1;  vs=2;  }
			if(b0==19 || b0==20) { op = b0/*+" "+b1*/;  vs=2; }
			if(21 <=b0 && b0<= 27) { op = b0;  vs=1; }
			if(b0==28) { val = bin.readShort(data,offset+1);  vs=3; }
			if(29 <=b0 && b0<= 31) { op = b0;  vs=1; }
			if(32 <=b0 && b0<=246) { val = b0-139;  vs=1; }
			if(247<=b0 && b0<=250) { val = (b0-247)*256+b1+108;  vs=2; }
			if(251<=b0 && b0<=254) { val =-(b0-251)*256-b1-108;  vs=2; }
			if(b0==255) {  val = bin.readInt(data, offset+1)/0xffff;  vs=5;   }
			
			arr.push(val!=null ? val : "o"+op);
			offset += vs;	

			//var cv = arr[arr.length-1];
			//if(cv==undefined) throw "error";
			//console.log()
		}	
		return arr;
	}

	Typr.CFF.readDict = function(data, offset, end)
	{
		var bin = Typr._bin;
		//var dict = [];
		var dict = {};
		var carr = [];
		
		while(offset<end)
		{
			var b0 = data[offset], b1 = data[offset+1], b2 = data[offset+2], b3 = data[offset+3], b4=data[offset+4];
			var vs = 1;
			var key=null, val=null;
			// operand
			if(b0==28) { val = bin.readShort(data,offset+1);  vs=3; }
			if(b0==29) { val = bin.readInt  (data,offset+1);  vs=5; }
			if(32 <=b0 && b0<=246) { val = b0-139;  vs=1; }
			if(247<=b0 && b0<=250) { val = (b0-247)*256+b1+108;  vs=2; }
			if(251<=b0 && b0<=254) { val =-(b0-251)*256-b1-108;  vs=2; }
			if(b0==255) {  val = bin.readInt(data, offset+1)/0xffff;  vs=5;  throw "unknown number";  }
			
			if(b0==30) 
			{  
				var nibs = [];
				vs = 1;
				while(true)
				{
					var b = data[offset+vs];  vs++;
					var nib0 = b>>4, nib1 = b&0xf;
					if(nib0 != 0xf) nibs.push(nib0);  if(nib1!=0xf) nibs.push(nib1);
					if(nib1==0xf) break;
				}
				var s = "";
				var chars = [0,1,2,3,4,5,6,7,8,9,".","e","e-","reserved","-","endOfNumber"];
				for(var i=0; i<nibs.length; i++) s += chars[nibs[i]];
				//console.log(nibs);
				val = parseFloat(s);
			}
			
			if(b0<=21)	// operator
			{
				var keys = ["version", "Notice", "FullName", "FamilyName", "Weight", "FontBBox", "BlueValues", "OtherBlues", "FamilyBlues","FamilyOtherBlues",
					"StdHW", "StdVW", "escape", "UniqueID", "XUID", "charset", "Encoding", "CharStrings", "Private", "Subrs", 
					"defaultWidthX", "nominalWidthX"];
					
				key = keys[b0];  vs=1;
				if(b0==12) { 
					var keys = [ "Copyright", "isFixedPitch", "ItalicAngle", "UnderlinePosition", "UnderlineThickness", "PaintType", "CharstringType", "FontMatrix", "StrokeWidth", "BlueScale",
					"BlueShift", "BlueFuzz", "StemSnapH", "StemSnapV", "ForceBold", 0,0, "LanguageGroup", "ExpansionFactor", "initialRandomSeed",
					"SyntheticBase", "PostScript", "BaseFontName", "BaseFontBlend", 0,0,0,0,0,0, 
					"ROS", "CIDFontVersion", "CIDFontRevision", "CIDFontType", "CIDCount", "UIDBase", "FDArray", "FDSelect", "FontName"];
					key = keys[b1];  vs=2; 
				}
			}
			
			if(key!=null) {  dict[key] = carr.length==1 ? carr[0] : carr;  carr=[]; }
			else  carr.push(val);  
			
			offset += vs;		
		}	
		return dict;
	}


Typr.cmap = {};
Typr.cmap.parse = function(data, offset, length)
{
	data = new Uint8Array(data.buffer, offset, length);
	offset = 0;

	var offset0 = offset;
	var bin = Typr._bin;
	var obj = {};
	var version   = bin.readUshort(data, offset);  offset += 2;
	var numTables = bin.readUshort(data, offset);  offset += 2;
	
	//console.log(version, numTables);
	
	var offs = [];
	obj.tables = [];
	
	
	for(var i=0; i<numTables; i++)
	{
		var platformID = bin.readUshort(data, offset);  offset += 2;
		var encodingID = bin.readUshort(data, offset);  offset += 2;
		var noffset = bin.readUint(data, offset);       offset += 4;
		
		var id = "p"+platformID+"e"+encodingID;
		
		//console.log("cmap subtable", platformID, encodingID, noffset);
		
		
		var tind = offs.indexOf(noffset);
		
		if(tind==-1)
		{
			tind = obj.tables.length;
			var subt;
			offs.push(noffset);
			var format = bin.readUshort(data, noffset);
			if     (format== 0) subt = Typr.cmap.parse0(data, noffset);
			else if(format== 4) subt = Typr.cmap.parse4(data, noffset);
			else if(format== 6) subt = Typr.cmap.parse6(data, noffset);
			else if(format==12) subt = Typr.cmap.parse12(data,noffset);
			else console.log("unknown format: "+format, platformID, encodingID, noffset);
			obj.tables.push(subt);
		}
		
		if(obj[id]!=null) throw "multiple tables for one platform+encoding";
		obj[id] = tind;
	}
	return obj;
}

Typr.cmap.parse0 = function(data, offset)
{
	var bin = Typr._bin;
	var obj = {};
	obj.format = bin.readUshort(data, offset);  offset += 2;
	var len    = bin.readUshort(data, offset);  offset += 2;
	var lang   = bin.readUshort(data, offset);  offset += 2;
	obj.map = [];
	for(var i=0; i<len-6; i++) obj.map.push(data[offset+i]);
	return obj;
}

Typr.cmap.parse4 = function(data, offset)
{
	var bin = Typr._bin;
	var offset0 = offset;
	var obj = {};
	
	obj.format = bin.readUshort(data, offset);  offset+=2;
	var length = bin.readUshort(data, offset);  offset+=2;
	var language = bin.readUshort(data, offset);  offset+=2;
	var segCountX2 = bin.readUshort(data, offset);  offset+=2;
	var segCount = segCountX2/2;
	obj.searchRange = bin.readUshort(data, offset);  offset+=2;
	obj.entrySelector = bin.readUshort(data, offset);  offset+=2;
	obj.rangeShift = bin.readUshort(data, offset);  offset+=2;
	obj.endCount   = bin.readUshorts(data, offset, segCount);  offset += segCount*2;
	offset+=2;
	obj.startCount = bin.readUshorts(data, offset, segCount);  offset += segCount*2;
	obj.idDelta = [];
	for(var i=0; i<segCount; i++) {obj.idDelta.push(bin.readShort(data, offset));  offset+=2;}
	obj.idRangeOffset = bin.readUshorts(data, offset, segCount);  offset += segCount*2;
	obj.glyphIdArray = [];
	while(offset< offset0+length) {obj.glyphIdArray.push(bin.readUshort(data, offset));  offset+=2;}
	return obj;
}

Typr.cmap.parse6 = function(data, offset)
{
	var bin = Typr._bin;
	var offset0 = offset;
	var obj = {};
	
	obj.format = bin.readUshort(data, offset);  offset+=2;
	var length = bin.readUshort(data, offset);  offset+=2;
	var language = bin.readUshort(data, offset);  offset+=2;
	obj.firstCode = bin.readUshort(data, offset);  offset+=2;
	var entryCount = bin.readUshort(data, offset);  offset+=2;
	obj.glyphIdArray = [];
	for(var i=0; i<entryCount; i++) {obj.glyphIdArray.push(bin.readUshort(data, offset));  offset+=2;}
	
	return obj;
}

Typr.cmap.parse12 = function(data, offset)
{
	var bin = Typr._bin;
	var offset0 = offset;
	var obj = {};
	
	obj.format = bin.readUshort(data, offset);  offset+=2;
	offset += 2;
	var length = bin.readUint(data, offset);  offset+=4;
	var lang   = bin.readUint(data, offset);  offset+=4;
	var nGroups= bin.readUint(data, offset);  offset+=4;
	obj.groups = [];
	
	for(var i=0; i<nGroups; i++)  
	{
		var off = offset + i * 12;
		var startCharCode = bin.readUint(data, off+0);
		var endCharCode   = bin.readUint(data, off+4);
		var startGlyphID  = bin.readUint(data, off+8);
		obj.groups.push([  startCharCode, endCharCode, startGlyphID  ]);
	}
	return obj;
}

Typr.glyf = {};
Typr.glyf.parse = function(data, offset, length, font)
{
	var obj = [];
	for(var g=0; g<font.maxp.numGlyphs; g++) obj.push(null);
	return obj;
}

Typr.glyf._parseGlyf = function(font, g)
{
	var bin = Typr._bin;
	var data = font._data;
	
	var offset = Typr._tabOffset(data, "glyf") + font.loca[g];
		
	if(font.loca[g]==font.loca[g+1]) return null;
		
	var gl = {};
		
	gl.noc  = bin.readShort(data, offset);  offset+=2;		// number of contours
	gl.xMin = bin.readShort(data, offset);  offset+=2;
	gl.yMin = bin.readShort(data, offset);  offset+=2;
	gl.xMax = bin.readShort(data, offset);  offset+=2;
	gl.yMax = bin.readShort(data, offset);  offset+=2;
	
	if(gl.xMin>=gl.xMax || gl.yMin>=gl.yMax) return null;
		
	if(gl.noc>0)
	{
		gl.endPts = [];
		for(var i=0; i<gl.noc; i++) { gl.endPts.push(bin.readUshort(data,offset)); offset+=2; }
		
		var instructionLength = bin.readUshort(data,offset); offset+=2;
		if((data.length-offset)<instructionLength) return null;
		gl.instructions = bin.readBytes(data, offset, instructionLength);   offset+=instructionLength;
		
		var crdnum = gl.endPts[gl.noc-1]+1;
		gl.flags = [];
		for(var i=0; i<crdnum; i++ ) 
		{ 
			var flag = data[offset];  offset++; 
			gl.flags.push(flag); 
			if((flag&8)!=0)
			{
				var rep = data[offset];  offset++;
				for(var j=0; j<rep; j++) { gl.flags.push(flag); i++; }
			}
		}
		gl.xs = [];
		for(var i=0; i<crdnum; i++) {
			var i8=((gl.flags[i]&2)!=0), same=((gl.flags[i]&16)!=0);  
			if(i8) { gl.xs.push(same ? data[offset] : -data[offset]);  offset++; }
			else
			{
				if(same) gl.xs.push(0);
				else { gl.xs.push(bin.readShort(data, offset));  offset+=2; }
			}
		}
		gl.ys = [];
		for(var i=0; i<crdnum; i++) {
			var i8=((gl.flags[i]&4)!=0), same=((gl.flags[i]&32)!=0);  
			if(i8) { gl.ys.push(same ? data[offset] : -data[offset]);  offset++; }
			else
			{
				if(same) gl.ys.push(0);
				else { gl.ys.push(bin.readShort(data, offset));  offset+=2; }
			}
		}
		var x = 0, y = 0;
		for(var i=0; i<crdnum; i++) { x += gl.xs[i]; y += gl.ys[i];  gl.xs[i]=x;  gl.ys[i]=y; }
		//console.log(endPtsOfContours, instructionLength, instructions, flags, xCoordinates, yCoordinates);
	}
	else
	{
		var ARG_1_AND_2_ARE_WORDS	= 1<<0;
		var ARGS_ARE_XY_VALUES		= 1<<1;
		var ROUND_XY_TO_GRID		= 1<<2;
		var WE_HAVE_A_SCALE			= 1<<3;
		var RESERVED				= 1<<4;
		var MORE_COMPONENTS			= 1<<5;
		var WE_HAVE_AN_X_AND_Y_SCALE= 1<<6;
		var WE_HAVE_A_TWO_BY_TWO	= 1<<7;
		var WE_HAVE_INSTRUCTIONS	= 1<<8;
		var USE_MY_METRICS			= 1<<9;
		var OVERLAP_COMPOUND		= 1<<10;
		var SCALED_COMPONENT_OFFSET	= 1<<11;
		var UNSCALED_COMPONENT_OFFSET	= 1<<12;
		
		gl.parts = [];
		var flags;
		do {
			flags = bin.readUshort(data, offset);  offset += 2;
			var part = { m:{a:1,b:0,c:0,d:1,tx:0,ty:0}, p1:-1, p2:-1 };  gl.parts.push(part);
			part.glyphIndex = bin.readUshort(data, offset);  offset += 2;
			if ( flags & ARG_1_AND_2_ARE_WORDS) {
				var arg1 = bin.readShort(data, offset);  offset += 2;
				var arg2 = bin.readShort(data, offset);  offset += 2;
			} else {
				var arg1 = bin.readInt8(data, offset);  offset ++;
				var arg2 = bin.readInt8(data, offset);  offset ++;
			}
			
			if(flags & ARGS_ARE_XY_VALUES) { part.m.tx = arg1;  part.m.ty = arg2; }
			else  {  part.p1=arg1;  part.p2=arg2;  }
			//part.m.tx = arg1;  part.m.ty = arg2;
			//else { throw "params are not XY values"; }
			
			if ( flags & WE_HAVE_A_SCALE ) {
				part.m.a = part.m.d = bin.readF2dot14(data, offset);  offset += 2;    
			} else if ( flags & WE_HAVE_AN_X_AND_Y_SCALE ) {
				part.m.a = bin.readF2dot14(data, offset);  offset += 2; 
				part.m.d = bin.readF2dot14(data, offset);  offset += 2; 
			} else if ( flags & WE_HAVE_A_TWO_BY_TWO ) {
				part.m.a = bin.readF2dot14(data, offset);  offset += 2; 
				part.m.b = bin.readF2dot14(data, offset);  offset += 2; 
				part.m.c = bin.readF2dot14(data, offset);  offset += 2; 
				part.m.d = bin.readF2dot14(data, offset);  offset += 2; 
			}
		} while ( flags & MORE_COMPONENTS ) 
		if (flags & WE_HAVE_INSTRUCTIONS){
			var numInstr = bin.readUshort(data, offset);  offset += 2;
			gl.instr = [];
			for(var i=0; i<numInstr; i++) { gl.instr.push(data[offset]);  offset++; }
		}
	}
	return gl;
}


Typr.GPOS = {};
Typr.GPOS.parse = function(data, offset, length, font) {  return Typr._lctf.parse(data, offset, length, font, Typr.GPOS.subt);  }



Typr.GPOS.subt = function(data, ltype, offset)	// lookup type
{
	if(ltype!=2) return null;
	
	var bin = Typr._bin, offset0 = offset, tab = {};
	
	tab.format  = bin.readUshort(data, offset);  offset+=2;
	var covOff  = bin.readUshort(data, offset);  offset+=2;
	tab.coverage = Typr._lctf.readCoverage(data, covOff+offset0);
	tab.valFmt1 = bin.readUshort(data, offset);  offset+=2;
	tab.valFmt2 = bin.readUshort(data, offset);  offset+=2;
	var ones1 = Typr._lctf.numOfOnes(tab.valFmt1);
	var ones2 = Typr._lctf.numOfOnes(tab.valFmt2);
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
				if(tab.valFmt1!=0) {  value1 = Typr._lctf.readValueRecord(data, psoff, tab.valFmt1);  psoff+=ones1*2;  }
				if(tab.valFmt2!=0) {  value2 = Typr._lctf.readValueRecord(data, psoff, tab.valFmt2);  psoff+=ones2*2;  }
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
		
		tab.classDef1 = Typr._lctf.readClassDef(data, offset0 + classDef1);
		tab.classDef2 = Typr._lctf.readClassDef(data, offset0 + classDef2);
		
		tab.matrix = [];
		for(var i=0; i<class1Count; i++)
		{
			var row = [];
			for(var j=0; j<class2Count; j++)
			{
				var value1 = null, value2 = null;
				if(tab.valFmt1!=0) { value1 = Typr._lctf.readValueRecord(data, offset, tab.valFmt1);  offset+=ones1*2; }
				if(tab.valFmt2!=0) { value2 = Typr._lctf.readValueRecord(data, offset, tab.valFmt2);  offset+=ones2*2; }
				row.push({val1:value1, val2:value2});
			}
			tab.matrix.push(row);
		}
	}
	return tab;
}

Typr.GSUB = {};
Typr.GSUB.parse = function(data, offset, length, font) {  return Typr._lctf.parse(data, offset, length, font, Typr.GSUB.subt);  }


Typr.GSUB.subt = function(data, ltype, offset)	// lookup type
{
	var bin = Typr._bin, offset0 = offset, tab = {};
	
	if(ltype!=1 && ltype!=4) return null;
	
	tab.fmt  = bin.readUshort(data, offset);  offset+=2;
	var covOff  = bin.readUshort(data, offset);  offset+=2;
	tab.coverage = Typr._lctf.readCoverage(data, covOff+offset0);	// not always is coverage here
	
	if(false) {}
	else if(ltype==1) {
		if(tab.fmt==1) {
			tab.delta = bin.readShort(data, offset);  offset+=2;
		}
		else if(tab.fmt==2) {
			var cnt = bin.readUshort(data, offset);  offset+=2;
			tab.newg = bin.readUshorts(data, offset, cnt);  offset+=tab.newg.length*2;
		}
	}
	else if(ltype==4) {
		tab.vals = [];
		var cnt = bin.readUshort(data, offset);  offset+=2;
		for(var i=0; i<cnt; i++) {
			var loff = bin.readUshort(data, offset);  offset+=2;
			tab.vals.push(Typr.GSUB.readLigatureSet(data, offset0+loff));
		}
		//console.log(tab.coverage);
		//console.log(tab.vals);
	} /*
	else if(ltype==6) {
		if(fmt==2) {
			var btDef = bin.readUshort(data, offset);  offset+=2;
			var inDef = bin.readUshort(data, offset);  offset+=2;
			var laDef = bin.readUshort(data, offset);  offset+=2;
			
			tab.btDef = Typr._lctf.readClassDef(data, offset0 + btDef);
			tab.inDef = Typr._lctf.readClassDef(data, offset0 + inDef);
			tab.laDef = Typr._lctf.readClassDef(data, offset0 + laDef);
			
			tab.scset = [];
			var cnt = bin.readUshort(data, offset);  offset+=2;
			for(var i=0; i<cnt; i++) {
				var loff = bin.readUshort(data, offset);  offset+=2;
				tab.scset.push(Typr.GSUB.readChainSubClassSet(data, offset0+loff));
			}
		}
	} */
	//if(tab.coverage.indexOf(3)!=-1) console.log(ltype, fmt, tab);
	
	return tab;
}

Typr.GSUB.readChainSubClassSet = function(data, offset)
{
	var bin = Typr._bin, offset0 = offset, lset = [];
	var cnt = bin.readUshort(data, offset);  offset+=2;
	for(var i=0; i<cnt; i++) {
		var loff = bin.readUshort(data, offset);  offset+=2;
		lset.push(Typr.GSUB.readChainSubClassRule(data, offset0+loff));
	}
	return lset;
}
Typr.GSUB.readChainSubClassRule= function(data, offset)
{
	var bin = Typr._bin, offset0 = offset, rule = {};
	var pps = ["backtrack", "input", "lookahead"];
	for(var pi=0; pi<pps.length; pi++) {
		var cnt = bin.readUshort(data, offset);  offset+=2;  if(pi==1) cnt--;
		rule[pps[pi]]=bin.readUshorts(data, offset, cnt);  offset+= rule[pps[pi]].length*2;
	}
	var cnt = bin.readUshort(data, offset);  offset+=2;
	rule.subst = bin.readUshorts(data, offset, cnt*2);  offset += rule.subst.length*2;
	return rule;
}

Typr.GSUB.readLigatureSet = function(data, offset)
{
	var bin = Typr._bin, offset0 = offset, lset = [];
	var lcnt = bin.readUshort(data, offset);  offset+=2;
	for(var j=0; j<lcnt; j++) {
		var loff = bin.readUshort(data, offset);  offset+=2;
		lset.push(Typr.GSUB.readLigature(data, offset0+loff));
	}
	return lset;
}
Typr.GSUB.readLigature = function(data, offset)
{
	var bin = Typr._bin, lig = {chain:[]};
	lig.nglyph = bin.readUshort(data, offset);  offset+=2;
	var ccnt = bin.readUshort(data, offset);  offset+=2;
	for(var k=0; k<ccnt-1; k++) {  lig.chain.push(bin.readUshort(data, offset));  offset+=2;  }
	return lig;
}



Typr.head = {};
Typr.head.parse = function(data, offset, length)
{
	var bin = Typr._bin;
	var obj = {};
	var tableVersion = bin.readFixed(data, offset);  offset += 4;
	obj.fontRevision = bin.readFixed(data, offset);  offset += 4;
	var checkSumAdjustment = bin.readUint(data, offset);  offset += 4;
	var magicNumber = bin.readUint(data, offset);  offset += 4;
	obj.flags = bin.readUshort(data, offset);  offset += 2;
	obj.unitsPerEm = bin.readUshort(data, offset);  offset += 2;
	obj.created  = bin.readUint64(data, offset);  offset += 8;
	obj.modified = bin.readUint64(data, offset);  offset += 8;
	obj.xMin = bin.readShort(data, offset);  offset += 2;
	obj.yMin = bin.readShort(data, offset);  offset += 2;
	obj.xMax = bin.readShort(data, offset);  offset += 2;
	obj.yMax = bin.readShort(data, offset);  offset += 2;
	obj.macStyle = bin.readUshort(data, offset);  offset += 2;
	obj.lowestRecPPEM = bin.readUshort(data, offset);  offset += 2;
	obj.fontDirectionHint = bin.readShort(data, offset);  offset += 2;
	obj.indexToLocFormat  = bin.readShort(data, offset);  offset += 2;
	obj.glyphDataFormat   = bin.readShort(data, offset);  offset += 2;
	return obj;
}


Typr.hhea = {};
Typr.hhea.parse = function(data, offset, length)
{
	var bin = Typr._bin;
	var obj = {};
	var tableVersion = bin.readFixed(data, offset);  offset += 4;
	obj.ascender  = bin.readShort(data, offset);  offset += 2;
	obj.descender = bin.readShort(data, offset);  offset += 2;
	obj.lineGap = bin.readShort(data, offset);  offset += 2;
	
	obj.advanceWidthMax = bin.readUshort(data, offset);  offset += 2;
	obj.minLeftSideBearing  = bin.readShort(data, offset);  offset += 2;
	obj.minRightSideBearing = bin.readShort(data, offset);  offset += 2;
	obj.xMaxExtent = bin.readShort(data, offset);  offset += 2;
	
	obj.caretSlopeRise = bin.readShort(data, offset);  offset += 2;
	obj.caretSlopeRun  = bin.readShort(data, offset);  offset += 2;
	obj.caretOffset    = bin.readShort(data, offset);  offset += 2;
	
	offset += 4*2;
	
	obj.metricDataFormat = bin.readShort (data, offset);  offset += 2;
	obj.numberOfHMetrics = bin.readUshort(data, offset);  offset += 2;
	return obj;
}


Typr.hmtx = {};
Typr.hmtx.parse = function(data, offset, length, font)
{
	var bin = Typr._bin;
	var obj = {};
	
	obj.aWidth = [];
	obj.lsBearing = [];
	
	
	var aw = 0, lsb = 0;
	
	for(var i=0; i<font.maxp.numGlyphs; i++)
	{
		if(i<font.hhea.numberOfHMetrics) {  aw=bin.readUshort(data, offset);  offset += 2;  lsb=bin.readShort(data, offset);  offset+=2;  }
		obj.aWidth.push(aw);
		obj.lsBearing.push(lsb);
	}
	
	return obj;
}


Typr.kern = {};
Typr.kern.parse = function(data, offset, length, font)
{
	var bin = Typr._bin;
	
	var version = bin.readUshort(data, offset);  offset+=2;
	if(version==1) return Typr.kern.parseV1(data, offset-2, length, font);
	var nTables = bin.readUshort(data, offset);  offset+=2;
	
	var map = {glyph1: [], rval:[]};
	for(var i=0; i<nTables; i++)
	{
		offset+=2;	// skip version
		var length  = bin.readUshort(data, offset);  offset+=2;
		var coverage = bin.readUshort(data, offset);  offset+=2;
		var format = coverage>>>8;
		/* I have seen format 128 once, that's why I do */ format &= 0xf;
		if(format==0) offset = Typr.kern.readFormat0(data, offset, map);
		else throw "unknown kern table format: "+format;
	}
	return map;
}

Typr.kern.parseV1 = function(data, offset, length, font)
{
	var bin = Typr._bin;
	
	var version = bin.readFixed(data, offset);  offset+=4;
	var nTables = bin.readUint(data, offset);  offset+=4;
	
	var map = {glyph1: [], rval:[]};
	for(var i=0; i<nTables; i++)
	{
		var length = bin.readUint(data, offset);   offset+=4;
		var coverage = bin.readUshort(data, offset);  offset+=2;
		var tupleIndex = bin.readUshort(data, offset);  offset+=2;
		var format = coverage>>>8;
		/* I have seen format 128 once, that's why I do */ format &= 0xf;
		if(format==0) offset = Typr.kern.readFormat0(data, offset, map);
		else throw "unknown kern table format: "+format;
	}
	return map;
}

Typr.kern.readFormat0 = function(data, offset, map)
{
	var bin = Typr._bin;
	var pleft = -1;
	var nPairs        = bin.readUshort(data, offset);  offset+=2;
	var searchRange   = bin.readUshort(data, offset);  offset+=2;
	var entrySelector = bin.readUshort(data, offset);  offset+=2;
	var rangeShift    = bin.readUshort(data, offset);  offset+=2;
	for(var j=0; j<nPairs; j++)
	{
		var left  = bin.readUshort(data, offset);  offset+=2;
		var right = bin.readUshort(data, offset);  offset+=2;
		var value = bin.readShort (data, offset);  offset+=2;
		if(left!=pleft) { map.glyph1.push(left);  map.rval.push({ glyph2:[], vals:[] }) }
		var rval = map.rval[map.rval.length-1];
		rval.glyph2.push(right);   rval.vals.push(value);
		pleft = left;
	}
	return offset;
}



Typr.loca = {};
Typr.loca.parse = function(data, offset, length, font)
{
	var bin = Typr._bin;
	var obj = [];
	
	var ver = font.head.indexToLocFormat;
	//console.log("loca", ver, length, 4*font.maxp.numGlyphs);
	var len = font.maxp.numGlyphs+1;
	
	if(ver==0) for(var i=0; i<len; i++) obj.push(bin.readUshort(data, offset+(i<<1))<<1);
	if(ver==1) for(var i=0; i<len; i++) obj.push(bin.readUint  (data, offset+(i<<2))   );
	
	return obj;
}


Typr.maxp = {};
Typr.maxp.parse = function(data, offset, length)
{
	//console.log(data.length, offset, length);
	
	var bin = Typr._bin;
	var obj = {};
	
	// both versions 0.5 and 1.0
	var ver = bin.readUint(data, offset); offset += 4;
	obj.numGlyphs = bin.readUshort(data, offset);  offset += 2;
	
	// only 1.0
	if(ver == 0x00010000)
	{
		obj.maxPoints             = bin.readUshort(data, offset);  offset += 2;
		obj.maxContours           = bin.readUshort(data, offset);  offset += 2;
		obj.maxCompositePoints    = bin.readUshort(data, offset);  offset += 2;
		obj.maxCompositeContours  = bin.readUshort(data, offset);  offset += 2;
		obj.maxZones              = bin.readUshort(data, offset);  offset += 2;
		obj.maxTwilightPoints     = bin.readUshort(data, offset);  offset += 2;
		obj.maxStorage            = bin.readUshort(data, offset);  offset += 2;
		obj.maxFunctionDefs       = bin.readUshort(data, offset);  offset += 2;
		obj.maxInstructionDefs    = bin.readUshort(data, offset);  offset += 2;
		obj.maxStackElements      = bin.readUshort(data, offset);  offset += 2;
		obj.maxSizeOfInstructions = bin.readUshort(data, offset);  offset += 2;
		obj.maxComponentElements  = bin.readUshort(data, offset);  offset += 2;
		obj.maxComponentDepth     = bin.readUshort(data, offset);  offset += 2;
	}
	
	return obj;
}


Typr.name = {};
Typr.name.parse = function(data, offset, length)
{
	var bin = Typr._bin;
	var obj = {};
	var format = bin.readUshort(data, offset);  offset += 2;
	var count  = bin.readUshort(data, offset);  offset += 2;
	var stringOffset = bin.readUshort(data, offset);  offset += 2;
	
	
	//console.log(format, count);
	
	var offset0 = offset;
	
	for(var i=0; i<count; i++)
	{
		var platformID = bin.readUshort(data, offset);  offset += 2;
		var encodingID = bin.readUshort(data, offset);  offset += 2;
		var languageID = bin.readUshort(data, offset);  offset += 2;
		var nameID     = bin.readUshort(data, offset);  offset += 2;
		var length     = bin.readUshort(data, offset);  offset += 2;
		var noffset    = bin.readUshort(data, offset);  offset += 2;
		//console.log(platformID, encodingID, languageID.toString(16), nameID, length, noffset);
		
		var plat = "p"+platformID;//Typr._platforms[platformID];
		if(obj[plat]==null) obj[plat] = {};
		
		var names = [
			"copyright",
			"fontFamily",
			"fontSubfamily",
			"ID",
			"fullName",
			"version",
			"postScriptName",
			"trademark",
			"manufacturer",
			"designer",
			"description",
			"urlVendor",
			"urlDesigner",
			"licence",
			"licenceURL",
			"---",
			"typoFamilyName",
			"typoSubfamilyName",
			"compatibleFull",
			"sampleText",
			"postScriptCID",
			"wwsFamilyName",
			"wwsSubfamilyName",
			"lightPalette",
			"darkPalette"
		];
		var cname = names[nameID];
		var soff = offset0 + count*12 + noffset;
		var str;
		if(false){}
		else if(platformID == 0) str = bin.readUnicode(data, soff, length/2);
		else if(platformID == 3 && encodingID == 0) str = bin.readUnicode(data, soff, length/2);
		else if(encodingID == 0) str = bin.readASCII  (data, soff, length);
		else if(encodingID == 1) str = bin.readUnicode(data, soff, length/2);
		else if(encodingID == 3) str = bin.readUnicode(data, soff, length/2);
		
		else if(platformID == 1) { str = bin.readASCII(data, soff, length);  console.log("reading unknown MAC encoding "+encodingID+" as ASCII") }
		else throw "unknown encoding "+encodingID + ", platformID: "+platformID;
		
		obj[plat][cname] = str;
		obj[plat]._lang = languageID;
	}
	/*
	if(format == 1)
	{
		var langTagCount = bin.readUshort(data, offset);  offset += 2;
		for(var i=0; i<langTagCount; i++)
		{
			var length  = bin.readUshort(data, offset);  offset += 2;
			var noffset = bin.readUshort(data, offset);  offset += 2;
		}
	}
	*/
	
	//console.log(obj);
	
	for(var p in obj) if(obj[p]._lang==1033) return obj[p];		// United States
	for(var p in obj) if(obj[p]._lang==   0) return obj[p];
	
	var tname;
	for(var p in obj) { tname=p; break; }
	console.log("returning name table with languageID "+ obj[tname]._lang);
	return obj[tname];
}


Typr["OS/2"] = {};
Typr["OS/2"].parse = function(data, offset, length)
{
	var bin = Typr._bin;
	var ver = bin.readUshort(data, offset); offset += 2;
	
	var obj = {};
	if     (ver==0) Typr["OS/2"].version0(data, offset, obj);
	else if(ver==1) Typr["OS/2"].version1(data, offset, obj);
	else if(ver==2 || ver==3 || ver==4) Typr["OS/2"].version2(data, offset, obj);
	else if(ver==5) Typr["OS/2"].version5(data, offset, obj);
	else throw "unknown OS/2 table version: "+ver;
	
	return obj;
}

Typr["OS/2"].version0 = function(data, offset, obj)
{
	var bin = Typr._bin;
	obj.xAvgCharWidth = bin.readShort(data, offset); offset += 2;
	obj.usWeightClass = bin.readUshort(data, offset); offset += 2;
	obj.usWidthClass  = bin.readUshort(data, offset); offset += 2;
	obj.fsType = bin.readUshort(data, offset); offset += 2;
	obj.ySubscriptXSize = bin.readShort(data, offset); offset += 2;
	obj.ySubscriptYSize = bin.readShort(data, offset); offset += 2;
	obj.ySubscriptXOffset = bin.readShort(data, offset); offset += 2;
	obj.ySubscriptYOffset = bin.readShort(data, offset); offset += 2; 
	obj.ySuperscriptXSize = bin.readShort(data, offset); offset += 2; 
	obj.ySuperscriptYSize = bin.readShort(data, offset); offset += 2; 
	obj.ySuperscriptXOffset = bin.readShort(data, offset); offset += 2;
	obj.ySuperscriptYOffset = bin.readShort(data, offset); offset += 2;
	obj.yStrikeoutSize = bin.readShort(data, offset); offset += 2;
	obj.yStrikeoutPosition = bin.readShort(data, offset); offset += 2;
	obj.sFamilyClass = bin.readShort(data, offset); offset += 2;
	obj.panose = bin.readBytes(data, offset, 10);  offset += 10;
	obj.ulUnicodeRange1	= bin.readUint(data, offset);  offset += 4;
	obj.ulUnicodeRange2	= bin.readUint(data, offset);  offset += 4;
	obj.ulUnicodeRange3	= bin.readUint(data, offset);  offset += 4;
	obj.ulUnicodeRange4	= bin.readUint(data, offset);  offset += 4;
	obj.achVendID = [bin.readInt8(data, offset), bin.readInt8(data, offset+1),bin.readInt8(data, offset+2),bin.readInt8(data, offset+3)];  offset += 4;
	obj.fsSelection	 = bin.readUshort(data, offset); offset += 2;
	obj.usFirstCharIndex = bin.readUshort(data, offset); offset += 2;
	obj.usLastCharIndex = bin.readUshort(data, offset); offset += 2;
	obj.sTypoAscender = bin.readShort(data, offset); offset += 2;
	obj.sTypoDescender = bin.readShort(data, offset); offset += 2;
	obj.sTypoLineGap = bin.readShort(data, offset); offset += 2;
	obj.usWinAscent = bin.readUshort(data, offset); offset += 2;
	obj.usWinDescent = bin.readUshort(data, offset); offset += 2;
	return offset;
}

Typr["OS/2"].version1 = function(data, offset, obj)
{
	var bin = Typr._bin;
	offset = Typr["OS/2"].version0(data, offset, obj);
	
	obj.ulCodePageRange1 = bin.readUint(data, offset); offset += 4;
	obj.ulCodePageRange2 = bin.readUint(data, offset); offset += 4;
	return offset;
}

Typr["OS/2"].version2 = function(data, offset, obj)
{
	var bin = Typr._bin;
	offset = Typr["OS/2"].version1(data, offset, obj);
	
	obj.sxHeight = bin.readShort(data, offset); offset += 2;
	obj.sCapHeight = bin.readShort(data, offset); offset += 2;
	obj.usDefault = bin.readUshort(data, offset); offset += 2;
	obj.usBreak = bin.readUshort(data, offset); offset += 2;
	obj.usMaxContext = bin.readUshort(data, offset); offset += 2;
	return offset;
}

Typr["OS/2"].version5 = function(data, offset, obj)
{
	var bin = Typr._bin;
	offset = Typr["OS/2"].version2(data, offset, obj);

	obj.usLowerOpticalPointSize = bin.readUshort(data, offset); offset += 2;
	obj.usUpperOpticalPointSize = bin.readUshort(data, offset); offset += 2;
	return offset;
}

Typr.post = {};
Typr.post.parse = function(data, offset, length)
{
	var bin = Typr._bin;
	var obj = {};
	
	obj.version           = bin.readFixed(data, offset);  offset+=4;
	obj.italicAngle       = bin.readFixed(data, offset);  offset+=4;
	obj.underlinePosition = bin.readShort(data, offset);  offset+=2;
	obj.underlineThickness = bin.readShort(data, offset);  offset+=2;

	return obj;
}
exports.default = Typr;
});