



Typr["U"]["SVG"] = (function() {
		var M = {
			getScale : function(m) {  return Math.sqrt(Math.abs(m[0]*m[3]-m[1]*m[2]));  },
			translate: function(m,x,y) {  M.concat(m, [1,0,0,1,x,y]);  },
			rotate   : function(m,a  ) {  M.concat(m, [Math.cos(a), -Math.sin(a), Math.sin(a), Math.cos(a),0,0]);  },
			scale    : function(m,x,y) {  M.concat(m, [x,0,0,y,0,0]);  },
			concat   : function(m,w  ) {  
				var a=m[0],b=m[1],c=m[2],d=m[3],tx=m[4],ty=m[5];
				m[0] = (a *w[0])+(b *w[2]);       m[1] = (a *w[1])+(b *w[3]);
				m[2] = (c *w[0])+(d *w[2]);       m[3] = (c *w[1])+(d *w[3]);
				m[4] = (tx*w[0])+(ty*w[2])+w[4];  m[5] = (tx*w[1])+(ty*w[3])+w[5]; 
			},
			invert   : function(m    ) {  
				var a=m[0],b=m[1],c=m[2],d=m[3],tx=m[4],ty=m[5], adbc=a*d-b*c;
				m[0] = d/adbc;  m[1] = -b/adbc;  m[2] =-c/adbc;  m[3] =  a/adbc;
				m[4] = (c*ty - d*tx)/adbc;  m[5] = (b*tx - a*ty)/adbc;
			},
			multPoint: function(m, p ) {  var x=p[0],y=p[1];  return [x*m[0]+y*m[2]+m[4],   x*m[1]+y*m[3]+m[5]];  },
			multArray: function(m, a ) {  for(var i=0; i<a.length; i+=2) {  var x=a[i],y=a[i+1];  a[i]=x*m[0]+y*m[2]+m[4];  a[i+1]=x*m[1]+y*m[3]+m[5];  }  }
		}
		
		function _bracketSplit(str, lbr, rbr) {
			var out = [], pos=0, ci = 0, lvl = 0;
			while(true) {  //throw "e";
				var li = str.indexOf(lbr, ci);
				var ri = str.indexOf(rbr, ci);
				if(li==-1 && ri==-1) break;
				if(ri==-1 || (li!=-1 && li<ri)) {
					if(lvl==0) {  out.push(str.slice(pos,li).trim());  pos=li+1;  }
					lvl++;  ci=li+1;
				}
				else if(li==-1 || (ri!=-1 && ri<li)) {
					lvl--;
					if(lvl==0) {  out.push(str.slice(pos,ri).trim());  pos=ri+1;  }
					ci=ri+1;
				}
			}
			return out;
		}
		//"cssMap": 
		function cssMap(str) {
			var pts = _bracketSplit(str, "{", "}");
			var css = {};
			for(var i=0; i<pts.length; i+=2) {
				var cn = pts[i].split(",");
				for(var j=0; j<cn.length; j++) {
					var cnj = cn[j].trim();  if(css[cnj]==null) css[cnj]="";
					css[cnj] += pts[i+1];
				}
			}
			return css;
		}
		//"readTrnf" 
		function readTrnf(trna) {
			var pts = _bracketSplit(trna, "(",")");
			var m = [1,0,0,1,0,0];
			for(var i=0; i<pts.length; i+=2) {  var om=m;  m=_readTrnsAttr(pts[i], pts[i+1]);  M.concat(m,om);  }
			return m;
		}
		
		function _readTrnsAttr(fnc, vls) {
			//console.log(vls);
			//vls = vls.replace(/\-/g, " -").trim();
			var m = [1,0,0,1,0,0], gotSep = true;
			for(var i=0; i<vls.length; i++) {	// matrix(.99915 0 0 .99915.418.552)   matrix(1 0 0-.9474-22.535 271.03)
				var ch = vls.charAt(i);
				if(ch=="," || ch==" ") gotSep = true;
				else if(ch==".") {
					if(!gotSep) {  vls = vls.slice(0,i) + ","+vls.slice(i);  i++;  }     gotSep = false;
				}
				else if(ch=="-" && i>0 && vls[i-1]!="e") {  vls = vls.slice(0,i) + " "+vls.slice(i);  i++;  gotSep=true;  }
			}
			
			vls = vls.split(/\s*[\s,]\s*/).map(parseFloat);
			if(false) {}
			else if(fnc=="translate" ) {  if(vls.length==1) M.translate(m,vls[0],     0);  else M.translate(m,vls[0],vls[1]);  }
			else if(fnc=="translateX") {  M.translate(m,vls[0],0);   }
			else if(fnc=="translateY") {  M.translate(m,0,vls[0]);   }
			else if(fnc=="scale"     ) {  if(vls.length==1) M.scale    (m,vls[0],vls[0]);  else M.scale    (m,vls[0],vls[1]);  }
			else if(fnc=="rotate"    ) {  var tx=0,ty=0;  if(vls.length!=1) { tx=vls[1];  ty=vls[2];  }  M.translate(m,-tx,-ty);  M.rotate(m,-Math.PI*vls[0]/180);  M.translate(m,tx,ty);  }
			else if(fnc=="matrix"    ) m = vls;
			else if(fnc=="skewX"     ) m = [1,Math.tan(vls[0]*Math.PI/180),0,1,0,0];
			else if(fnc=="skewY"     ) m = [1,0,Math.tan(vls[0]*Math.PI/180),1,0,0];
			else console.log("unknown transform: ", fnc);
			return m;
		}
		
		function toPath(svg, gid) {
			var pth = {cmds:[], crds:[]};
			
			var vb = svg.getAttribute("viewBox");
			if(vb) vb = vb.trim().split(" ").map(parseFloat);  else   vb = [0,0,1000,1000];
			
			var nod = svg;
			if(gid!=null) {  var nd = svg.getElementById("glyph"+gid);  if(nd) nod=nd;  }
			
			_toPath(nod.children, pth,null,svg);
			for(var i=0; i<pth.crds.length; i+=2) {
				var x = pth.crds[i], y = pth.crds[i+1];
				x -= vb[0];
				y -= vb[1];
				y = -y;
				pth.crds[i] = x;
				pth.crds[i+1] = y;
			}
			return pth;
		}

		var cmap = {"aliceblue":"#f0f8ff","antiquewhite":"#faebd7","aqua":"#00ffff","aquamarine":"#7fffd4","azure":"#f0ffff","beige":"#f5f5dc","bisque":"#ffe4c4",
			"black":"#000000","blanchedalmond":"#ffebcd","blue":"#0000ff","blueviolet":"#8a2be2","brown":"#a52a2a","burlywood":"#deb887","cadetblue":"#5f9ea0",
			"chartreuse":"#7fff00","chocolate":"#d2691e","coral":"#ff7f50","cornflowerblue":"#6495ed","cornsilk":"#fff8dc","crimson":"#dc143c","cyan":"#00ffff",
			"darkblue":"#00008b","darkcyan":"#008b8b","darkgoldenrod":"#b8860b","darkgray":"#a9a9a9","darkgreen":"#006400","darkgrey":"#a9a9a9","darkkhaki":"#bdb76b",
			"darkmagenta":"#8b008b","darkolivegreen":"#556b2f","darkorange":"#ff8c00","darkorchid":"#9932cc","darkred":"#8b0000","darksalmon":"#e9967a","darkseagreen":"#8fbc8f",
			"darkslateblue":"#483d8b","darkslategray":"#2f4f4f","darkslategrey":"#2f4f4f","darkturquoise":"#00ced1","darkviolet":"#9400d3","deeppink":"#ff1493",
			"deepskyblue":"#00bfff","dimgray":"#696969","dimgrey":"#696969","dodgerblue":"#1e90ff","firebrick":"#b22222","floralwhite":"#fffaf0","forestgreen":"#228b22",
			"fuchsia":"#ff00ff","gainsboro":"#dcdcdc","ghostwhite":"#f8f8ff","gold":"#ffd700","goldenrod":"#daa520","gray":"#808080","green":"#008000","greenyellow":"#adff2f",
			"grey":"#808080","honeydew":"#f0fff0","hotpink":"#ff69b4","indianred":"#cd5c5c","indigo":"#4b0082","ivory":"#fffff0","khaki":"#f0e68c","lavender":"#e6e6fa",
			"lavenderblush":"#fff0f5","lawngreen":"#7cfc00","lemonchiffon":"#fffacd","lightblue":"#add8e6","lightcoral":"#f08080","lightcyan":"#e0ffff",
			"lightgoldenrodyellow":"#fafad2","lightgray":"#d3d3d3","lightgreen":"#90ee90","lightgrey":"#d3d3d3","lightpink":"#ffb6c1","lightsalmon":"#ffa07a",
			"lightseagreen":"#20b2aa","lightskyblue":"#87cefa","lightslategray":"#778899","lightslategrey":"#778899","lightsteelblue":"#b0c4de","lightyellow":"#ffffe0",
			"lime":"#00ff00","limegreen":"#32cd32","linen":"#faf0e6","magenta":"#ff00ff","maroon":"#800000","mediumaquamarine":"#66cdaa","mediumblue":"#0000cd",
			"mediumorchid":"#ba55d3","mediumpurple":"#9370db","mediumseagreen":"#3cb371","mediumslateblue":"#7b68ee","mediumspringgreen":"#00fa9a",
			"mediumturquoise":"#48d1cc","mediumvioletred":"#c71585","midnightblue":"#191970","mintcream":"#f5fffa","mistyrose":"#ffe4e1","moccasin":"#ffe4b5",
			"navajowhite":"#ffdead","navy":"#000080","oldlace":"#fdf5e6","olive":"#808000","olivedrab":"#6b8e23","orange":"#ffa500","orangered":"#ff4500",
			"orchid":"#da70d6","palegoldenrod":"#eee8aa","palegreen":"#98fb98","paleturquoise":"#afeeee","palevioletred":"#db7093","papayawhip":"#ffefd5",
			"peachpuff":"#ffdab9","peru":"#cd853f","pink":"#ffc0cb","plum":"#dda0dd","powderblue":"#b0e0e6","purple":"#800080","rebeccapurple":"#663399","red":"#ff0000",
			"rosybrown":"#bc8f8f","royalblue":"#4169e1","saddlebrown":"#8b4513","salmon":"#fa8072","sandybrown":"#f4a460","seagreen":"#2e8b57","seashell":"#fff5ee",
			"sienna":"#a0522d","silver":"#c0c0c0","skyblue":"#87ceeb","slateblue":"#6a5acd","slategray":"#708090","slategrey":"#708090","snow":"#fffafa","springgreen":"#00ff7f",
			"steelblue":"#4682b4","tan":"#d2b48c","teal":"#008080","thistle":"#d8bfd8","tomato":"#ff6347","turquoise":"#40e0d0","violet":"#ee82ee","wheat":"#f5deb3",
			"white":"#ffffff","whitesmoke":"#f5f5f5","yellow":"#ffff00","yellowgreen":"#9acd32"};
			
		function _toPath(nds, pth, fill,root) {
			for(var ni=0; ni<nds.length; ni++) {
				var nd = nds[ni], tn = nd.tagName;
				var cfl = nd.getAttribute("fill");  if(cfl==null) cfl = fill;
				if(cfl && cfl.startsWith("url")) {
					var gid = cfl.slice(5,-1);
					var grd = root.getElementById(gid), s0=grd.children[0];
					if(s0.getAttribute("stop-opacity")!=null) continue;
					cfl=s0.getAttribute("stop-color");
				}
				if(cmap[cfl]) cfl=cmap[cfl];
				if(tn=="g" || tn=="use") {
					var tp = {crds:[], cmds:[]};
					if(tn=="g")	_toPath(nd.children, tp, cfl, root);
					else {
						var lnk = nd.getAttribute("xlink:href").slice(1);
						var pel = root.getElementById(lnk);
						_toPath([pel], tp, cfl, root);
					}
					var m=[1,0,0,1,0,0];
					var x=nd.getAttribute("x"),y=nd.getAttribute("y");  x=x?parseFloat(x):0;  y=y?parseFloat(y):0;
					M.concat(m,[1,0,0,1,x,y]);
					
					var trf = nd.getAttribute("transform");  if(trf) M.concat(m,readTrnf(trf));
					
					M.multArray(m, tp.crds);
					pth.crds=pth.crds.concat(tp.crds);
					pth.cmds=pth.cmds.concat(tp.cmds);
				}
				else if(tn=="path" || tn=="circle" || tn=="ellipse") {
					pth.cmds.push(cfl?cfl:"#000000");
					var d;
					if(tn=="path") d = nd.getAttribute("d");  //console.log(d);
					if(tn=="circle" || tn=="ellipse") {
						var vls=[0,0,0,0], nms=["cx","cy","rx","ry","r"];
						for(var i=0; i<5; i++) {  var V=nd.getAttribute(nms[i]);  if(V) {  V=parseFloat(V);  if(i<4) vls[i]=V;  else vls[2]=vls[3]=V;  }  }
						var cx=vls[0],cy=vls[1],rx=vls[2],ry=vls[3];
						d = ["M",cx-rx,cy,"a",rx,ry,0,1,0,rx*2,0,"a",rx,ry,0,1,0,-rx*2,0].join(" ");
					}
					svgToPath(d, pth);  pth.cmds.push("X");
				}
				else if(tn=="image") {
					var w = parseFloat(nd.getAttribute("width")),h=parseFloat(nd.getAttribute("height"));
					pth.cmds.push(nd.getAttribute("xlink:href"));
					pth.crds.push(0,0,w,0,w,h,0,h);
				}
				else if(tn=="defs") {}
				else console.log(tn);
			}
		}

		function _tokens(d) {
			var ts = [], off = 0, rn=false, cn="", pc="", lc="", nc=0;  // reading number, current number, prev char, lastCommand, number count (after last command
			while(off<d.length){
				var cc=d.charCodeAt(off), ch = d.charAt(off);  off++;
				var isNum = (48<=cc && cc<=57) || ch=="." || ch=="-" || ch=="+" || ch=="e" || ch=="E";
				
				if(rn) {
					if( ((ch=="+"||ch=="-") && pc!="e") || (ch=="." && cn.indexOf(".")!=-1) || (isNum && (lc=="a"||lc=="A") && ((nc%7)==3||(nc%7)==4))) {  ts.push(parseFloat(cn));  nc++;  cn=ch;  }
					else if(isNum) cn+=ch;
					else {  ts.push(parseFloat(cn));  nc++;  if(ch!="," && ch!=" " && ch!="\n") {  ts.push(ch);  lc=ch;  nc=0;  }  rn=false;  }
				}
				else {
					if(isNum) {  cn=ch;  rn=true;  }
					else if(ch!="," && ch!=" " && ch!="\n") {  ts.push(ch);  lc=ch;  nc=0;  }
				}
				pc = ch;
			}
			if(rn) ts.push(parseFloat(cn));
			return ts;
		}
		
		function _reps(ts, off, ps) {
			var i = off;
			while(i<ts.length) {  if((typeof ts[i]) == "string") break;  i+=ps;  }
			return (i-off)/ps;
		}

		function svgToPath(d, pth) {	
			var ts = _tokens(d);
			var i = 0, x = 0, y = 0, ox = 0, oy = 0, oldo=pth.crds.length;
			var pc = {"M":2,"L":2,"H":1,"V":1,   "T":2,"S":4, "A":7,   "Q":4, "C":6};
			var cmds = pth.cmds, crds = pth.crds;
			
			while(i<ts.length) {
				var cmd = ts[i];  i++;
				var cmu = cmd.toUpperCase();
				
				if(cmu=="Z") {  cmds.push("Z");  x=ox;  y=oy;  }
				else {
					var ps = pc[cmu], reps = _reps(ts, i, ps);
				
					for(var j=0; j<reps; j++) {
						// If a moveto is followed by multiple pairs of coordinates, the subsequent pairs are treated as implicit lineto commands.
						if(j==1 && cmu=="M") {  cmd=(cmd==cmu)?"L":"l";  cmu="L";  }
						
						var xi = 0, yi = 0;   if(cmd!=cmu) {  xi=x;  yi=y;  }
						
						if(false) {}
						else if(cmu=="M") {  x = xi+ts[i++];  y = yi+ts[i++];  cmds.push("M");  crds.push(x,y);  ox=x;  oy=y; }
						else if(cmu=="L") {  x = xi+ts[i++];  y = yi+ts[i++];  cmds.push("L");  crds.push(x,y);  }
						else if(cmu=="H") {  x = xi+ts[i++];                   cmds.push("L");  crds.push(x,y);  }
						else if(cmu=="V") {  y = yi+ts[i++];                   cmds.push("L");  crds.push(x,y);  }
						else if(cmu=="Q") {
							var x1=xi+ts[i++], y1=yi+ts[i++], x2=xi+ts[i++], y2=yi+ts[i++];
							cmds.push("Q");  crds.push(x1,y1,x2,y2);  x=x2;  y=y2;
						}
						else if(cmu=="T") {
							var co = Math.max(crds.length-(cmds[cmds.length-1]=="Q"?4:2), oldo);
							var x1 = x+x-crds[co], y1 = y+y-crds[co+1];
							var x2=xi+ts[i++], y2=yi+ts[i++];  
							cmds.push("Q");  crds.push(x1,y1,x2,y2);  x=x2;  y=y2;
						}
						else if(cmu=="C") {
							var x1=xi+ts[i++], y1=yi+ts[i++], x2=xi+ts[i++], y2=yi+ts[i++], x3=xi+ts[i++], y3=yi+ts[i++];
							cmds.push("C");  crds.push(x1,y1,x2,y2,x3,y3);  x=x3;  y=y3;
						}
						else if(cmu=="S") {
							var co = Math.max(crds.length-(cmds[cmds.length-1]=="C"?4:2), oldo);
							var x1 = x+x-crds[co], y1 = y+y-crds[co+1];
							var x2=xi+ts[i++], y2=yi+ts[i++], x3=xi+ts[i++], y3=yi+ts[i++];  
							cmds.push("C");  crds.push(x1,y1,x2,y2,x3,y3);  x=x3;  y=y3;
						}
						else if(cmu=="A") {  // convert SVG Arc to four cubic bézier segments "C"
							var x1 = x, y1 = y;
							var rx = ts[i++], ry = ts[i++];
							var phi = ts[i++]*(Math.PI/180), fA = ts[i++], fS = ts[i++];
							var x2 = xi+ts[i++], y2 = yi+ts[i++];
							if(x2==x && y2==y && rx==0 && ry==0) continue;
							if(rx==0 || ry==0) {  cmds.push("L");  crds.push(x2,y2);  continue;  }
							
							var hdx = (x1-x2)/2, hdy = (y1-y2)/2;
							var cosP = Math.cos(phi), sinP = Math.sin(phi);
							var x1A =  cosP * hdx + sinP * hdy;
							var y1A = -sinP * hdx + cosP * hdy;
							
							var rxS = rx*rx, ryS = ry*ry;
							var x1AS  = x1A*x1A, y1AS = y1A*y1A;
							var frc = (rxS*ryS  - rxS*y1AS - ryS*x1AS)  /  (rxS*y1AS + ryS*x1AS);
							var coef = (fA!=fS ? 1 : -1) * Math.sqrt(  Math.max(frc,0)  );
							var cxA =  coef * (rx * y1A) / ry;
							var cyA = -coef * (ry * x1A) / rx;
							
							var cx = cosP*cxA - sinP*cyA + (x1+x2)/2;
							var cy = sinP*cxA + cosP*cyA + (y1+y2)/2;
							
							var angl = function(ux,uy,vx,vy) {  var lU = Math.sqrt(ux*ux+uy*uy), lV = Math.sqrt(vx*vx+vy*vy);
									var num = (ux*vx+uy*vy) / (lU*lV);  //console.log(num, Math.acos(num));
									return (ux*vy-uy*vx>=0?1:-1) * Math.acos( Math.max(-1, Math.min(1, num)) );  }
							
							var vX = (x1A-cxA)/rx, vY = (y1A-cyA)/ry;
							var theta1 = angl( 1, 0, vX,vY);
							var dtheta = angl(vX,vY, (-x1A-cxA)/rx, (-y1A-cyA)/ry);
							dtheta = dtheta % (2*Math.PI);
							
							var arc = function(gst,x,y,r,a0,a1, neg) {
								var rotate = function(m, a) {  var si=Math.sin(a), co=Math.cos(a);
									var a=m[0],b=m[1],c=m[2],d=m[3];
									m[0] = (a *co)+(b *si);   m[1] = (-a *si)+(b *co);
									m[2] = (c *co)+(d *si);   m[3] = (-c *si)+(d *co);
								}
								var multArr= function(m,a) {
									for(var j=0; j<a.length; j+=2) {
										var x=a[j], y=a[j+1];
										a[j  ] = m[0]*x + m[2]*y + m[4];
										a[j+1] = m[1]*x + m[3]*y + m[5];
									}
								}
								var concatA= function(a,b) {  for(var j=0; j<b.length; j++) a.push(b[j]);  }
								var concatP= function(p,r) {  concatA(p.cmds,r.cmds);  concatA(p.crds,r.crds);  }
								// circle from a0 counter-clock-wise to a1
								if(neg) while(a1>a0) a1-=2*Math.PI;
								else    while(a1<a0) a1+=2*Math.PI;
								var th = (a1-a0)/4;
								
								var x0 = Math.cos(th/2), y0 = -Math.sin(th/2);
								var x1 = (4-x0)/3, y1 = y0==0 ? y0 : (1-x0)*(3-x0)/(3*y0);
								var x2 = x1, y2 = -y1;
								var x3 = x0, y3 = -y0;
								
								var ps = [x1,y1,x2,y2,x3,y3];
								
								var pth = {cmds:["C","C","C","C"], crds:ps.slice(0)};
								var rot = [1,0,0,1,0,0];  rotate(rot,-th);
								for(var j=0; j<3; j++) {  multArr(rot,ps);  concatA(pth.crds,ps);  }
								
								rotate(rot, -a0+th/2);  rot[0]*=r;  rot[1]*=r;  rot[2]*=r;  rot[3]*=r;  rot[4]=x;  rot[5]=y; 
								multArr(rot, pth.crds);
								multArr(gst.ctm, pth.crds);
								concatP(gst.pth, pth);
							}
							
							var gst = {pth:pth, ctm:[rx*cosP,rx*sinP,-ry*sinP,ry*cosP,cx,cy]};
							arc(gst, 0,0, 1, theta1, theta1+dtheta, fS==0);
							x=x2;  y=y2;
						}
						else console.log("Unknown SVG command "+cmd);
					}
				}
			}
		};
		return {  
			"cssMap":cssMap, "readTrnf":readTrnf, 
			svgToPath:svgToPath, // "d" text attribute to path
			toPath   :toPath     // SVG object element to path
		};
	})();
	
	