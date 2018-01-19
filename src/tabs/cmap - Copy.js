Typr.SVG = {};
Typr.SVG.parse = function(data, offset, length)
{
	var bin = Typr._bin;
	var obj = { entries: []};

	var offset0 = offset;

	var tableVersion = bin.readUshort(data, offset);	offset += 2;
	var svgDocIndexOffset = bin.readUint(data, offset);	offset += 4;
	var reserved = bin.readUint(data, offset); offset += 4;

	offset = svgDocIndexOffset + offset0;

	var numEntries = bin.readUshort(data, offset);	offset += 2;

	for(var i=0; i<numEntries; i++)
	{
		var startGlyphID = bin.readUshort(data, offset);	offset += 2;
		var endGlyphID = bin.readUshort(data, offset);	offset += 2;
		var svgDocOffset = bin.readUint(data, offset);	offset += 4;
		var svgDocLength = bin.readUint(data, offset); offset += 4;

		var svg = bin.readASCII(data, offset0 + svgDocOffset + svgDocIndexOffset, svgDocLength);
		var pth = Typr.SVG.toPath(svg);

		for(var f=startGlyphID; f<=endGlyphID; f++){
			obj.entries[f] = pth;
		}
	}
	return obj;
}

Typr.SVG.toPath = function(str)
{
	var pth = {cmds:[], crds:[]};
	if(str==null) return pth;
	
	var prsr = new DOMParser();
	var doc = prsr["parseFromString"](str,"image/svg+xml");
	
	var svg = doc.firstChild;  while(svg.tagName!="svg") svg = svg.nextSibling;
	Typr.SVG._toPath(svg.children, pth);
	for(var i=1; i<pth.crds.length; i+=2) pth.crds[i] = -pth.crds[i];
	return pth;
}

Typr.SVG._toPath = function(nds, pth)
{
	for(var ni=0; ni<nds.length; ni++)
	{
		var nd = nds[ni], tn = nd.tagName;
		if(tn=="g") Typr.SVG._toPath(nd.children, pth);
		else if(tn=="path") {
			var d = nd.getAttribute("d");  //console.log(d);
			var fl= nd.getAttribute("fill");  if(fl) pth.cmds.push(fl);
			var toks = Typr.SVG._tokens(d);  //console.log(toks);
			Typr.SVG._toksToPath(toks, pth);  pth.cmds.push("Z","X");
			
		}
		else console.log(tn);
	}
}

Typr.SVG._tokens = function(d) {
	var ts = [], off = 0, rn=false, cn="";  // reading number, current number
	while(off<d.length){
		var cc=d.charCodeAt(off), ch = d.charAt(off);  off++;
		var isNum = (48<=cc && cc<=57) || ch=="." || ch=="-";
		
		if(rn) {
			if(isNum) cn+=ch;
			else {  ts.push(parseFloat(cn));  if(ch!="," && ch!=" ") ts.push(ch);  rn=false;  }
		}
		else {
			if(isNum) {  cn=ch;  rn=true;  }
			else if(ch!="," && ch!=" ") ts.push(ch);
		}
	}
	if(rn) ts.push(parseFloat(cn));
	return ts;
}

Typr.SVG._toksToPath = function(ts, pth) {
	var i = 0, x = 0, y = 0;
	while(i<ts.length) {
		var cmd = ts[i];  i++;
		if(false) {}
		else if(cmd=="M") {  x = ts[i++];  y = ts[i++];  pth.cmds.push("M");  pth.crds.push(x,y);  }
		else if(cmd=="l") {  x+= ts[i++];  y+= ts[i++];  pth.cmds.push("L");  pth.crds.push(x,y);  }
		else if(cmd=="h") {  x+= ts[i++];                pth.cmds.push("L");  pth.crds.push(x,y);  }
		else if(cmd=="v") {  y+= ts[i++];                pth.cmds.push("L");  pth.crds.push(x,y);  }
		else if(cmd=="c") {
			var x1=x+ts[i++], y1=y+ts[i++], x2=x+ts[i++], y2=y+ts[i++], x3=x+ts[i++], y3=y+ts[i++];
			pth.cmds.push("C");  pth.crds.push(x1,y1,x2,y2,x3,y3);  x=x3;  y=y3;
		}
		else if(cmd=="z") pth.cmds.push("Z");
		else console.log("Unknown SVG command "+cmd);
	}
}