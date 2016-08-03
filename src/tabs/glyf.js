

Typr.glyf = {};
Typr.glyf.parse = function(data, offset, length, font)
{
	var offset0 = offset;
	var bin = Typr._bin;
	var obj = [];
	
	//console.log(offset, length, "glyphs:", font.loca.length);
	
	//console.log(font.loca.length, font.loca, offset0+font.loca[93]);

	for(var g=0; g<font.loca.length-1; g++)
	{
		offset = offset0 + font.loca[g];
		
		if(font.loca[g]==font.loca[g+1]) {  obj.push(null);  continue;  }
		
		var gl = {};  obj.push(gl);
		
		gl.noc  = bin.readShort(data, offset);  offset+=2;		// number of contours
		gl.xMin = bin.readShort(data, offset);  offset+=2;
		gl.yMin = bin.readShort(data, offset);  offset+=2;
		gl.xMax = bin.readShort(data, offset);  offset+=2;
		gl.yMax = bin.readShort(data, offset);  offset+=2;
		
		if(gl.xMin>=gl.xMax || gl.yMin>=gl.yMax) { obj.pop();  obj.push(null); continue; }
		
		if(gl.noc>0)
		{
			gl.endPts = [];
			for(var i=0; i<gl.noc; i++) { gl.endPts.push(bin.readUshort(data,offset)); offset+=2; }
			
			var instructionLength = bin.readUshort(data,offset); offset+=2;
			if((data.length-offset)<instructionLength) { obj.pop();  obj.push(null); continue; }
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
	}
	
	
	return obj;
}
