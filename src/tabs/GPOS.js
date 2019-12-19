

Typr.GPOS = {};
Typr.GPOS.parse = function(data, offset, length, font) {  return Typr._lctf.parse(data, offset, length, font, Typr.GPOS.subt);  }


Typr.GPOS.subt = function(data, ltype, offset, ltable)	// lookup type
{
	var bin = Typr._bin, offset0 = offset, tab = {};
	
	tab.fmt  = bin.readUshort(data, offset);  offset+=2;
	
	//console.warn(ltype, tab.fmt);
	
	if(ltype==1 || ltype==2 || ltype==3 || ltype==7 || (ltype==8 && tab.fmt<=2)) {
		var covOff  = bin.readUshort(data, offset);  offset+=2;
		tab.coverage = Typr._lctf.readCoverage(data, covOff+offset0);
	}
	if(ltype==1 && tab.fmt==1) {
		var valFmt1 = bin.readUshort(data, offset);  offset+=2;
		var ones1 = Typr._lctf.numOfOnes(valFmt1);
		if(valFmt1!=0)  tab.pos = Typr.GPOS.readValueRecord(data, offset, valFmt1);
	}
	else if(ltype==2 && tab.fmt>=1 && tab.fmt<=2) {
		var valFmt1 = bin.readUshort(data, offset);  offset+=2;
		var valFmt2 = bin.readUshort(data, offset);  offset+=2;
		var ones1 = Typr._lctf.numOfOnes(valFmt1);
		var ones2 = Typr._lctf.numOfOnes(valFmt2);
		if(tab.fmt==1)
		{
			tab.pairsets = [];
			var psc = bin.readUshort(data, offset);  offset+=2;  // PairSetCount
			
			for(var i=0; i<psc; i++)
			{
				var psoff = offset0 + bin.readUshort(data, offset);  offset+=2;
				
				var pvc = bin.readUshort(data, psoff);  psoff+=2;
				var arr = [];
				for(var j=0; j<pvc; j++)
				{
					var gid2 = bin.readUshort(data, psoff);  psoff+=2;
					var value1, value2;
					if(valFmt1!=0) {  value1 = Typr.GPOS.readValueRecord(data, psoff, valFmt1);  psoff+=ones1*2;  }
					if(valFmt2!=0) {  value2 = Typr.GPOS.readValueRecord(data, psoff, valFmt2);  psoff+=ones2*2;  }
					//if(value1!=null) throw "e";
					arr.push({gid2:gid2, val1:value1, val2:value2});
				}
				tab.pairsets.push(arr);
			}
		}
		if(tab.fmt==2)
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
					if(valFmt1!=0) { value1 = Typr.GPOS.readValueRecord(data, offset, valFmt1);  offset+=ones1*2; }
					if(valFmt2!=0) { value2 = Typr.GPOS.readValueRecord(data, offset, valFmt2);  offset+=ones2*2; }
					row.push({val1:value1, val2:value2});
				}
				tab.matrix.push(row);
			}
		}
	}
	else if(ltype==9 && tab.fmt==1) {
		var extType = bin.readUshort(data, offset);  offset+=2;
		var extOffset = bin.readUint(data, offset);  offset+=4;
		if (ltable.ltype==9) {
			ltable.ltype = extType;
		} else if (ltable.ltype!=extType) {
			throw "invalid extension substitution"; // all subtables must be the same type
		}
		return Typr.GPOS.subt(data, ltable.ltype, offset0+extOffset);
	}
	/*else if(ltype==4) {
		
	}*/
	return tab;
}


Typr.GPOS.readValueRecord = function(data, offset, valFmt)
{
	var bin = Typr._bin;
	var arr = [];
	arr.push( (valFmt&1) ? bin.readShort(data, offset) : 0 );  offset += (valFmt&1) ? 2 : 0;  // X_PLACEMENT
	arr.push( (valFmt&2) ? bin.readShort(data, offset) : 0 );  offset += (valFmt&2) ? 2 : 0;  // Y_PLACEMENT
	arr.push( (valFmt&4) ? bin.readShort(data, offset) : 0 );  offset += (valFmt&4) ? 2 : 0;  // X_ADVANCE
	arr.push( (valFmt&8) ? bin.readShort(data, offset) : 0 );  offset += (valFmt&8) ? 2 : 0;  // Y_ADVANCE
	return arr;
}