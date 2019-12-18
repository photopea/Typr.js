const bin = {
	readFixed: function (data, o) {
		return ((data[o] << 8) | data[o + 1]) + (((data[o + 2] << 8) | data[o + 3]) / (256 * 256 + 4));
	},
	readF2dot14: function (data, o) {
		const num = bin.readShort(data, o);
		return num / 16384;
	},
	readInt: function (buff, p) {
		//if(p>=buff.length) throw "error";
		const a = bin.t.uint8;
		a[0] = buff[p + 3];
		a[1] = buff[p + 2];
		a[2] = buff[p + 1];
		a[3] = buff[p];
		return bin.t.int32[0];
	},

	readInt8: function (buff, p) {
		//if(p>=buff.length) throw "error";
		const a = bin.t.uint8;
		a[0] = buff[p];
		return bin.t.int8[0];
	},
	readShort: function (buff, p) {
		//if(p>=buff.length) throw "error";
		const a = bin.t.uint8;
		a[1] = buff[p]; a[0] = buff[p + 1];
		return bin.t.int16[0];
	},
	readUshort: function (buff, p) {
		//if(p>=buff.length) throw "error";
		return (buff[p] << 8) | buff[p + 1];
	},
	readUshorts: function (buff, p, len) {
		const arr = [];
		for (let i = 0; i < len; i++) arr.push(bin.readUshort(buff, p + i * 2));
		return arr;
	},
	readUint: function (buff, p) {
		//if(p>=buff.length) throw "error";
		const a = bin.t.uint8;
		a[3] = buff[p]; a[2] = buff[p + 1]; a[1] = buff[p + 2]; a[0] = buff[p + 3];
		return bin.t.uint32[0];
	},
	readUint64: function (buff, p) {
		//if(p>=buff.length) throw "error";
		return (bin.readUint(buff, p) * (0xffffffff + 1)) + bin.readUint(buff, p + 4);
	},
	readASCII: function (buff, p, l)	// l : length in Characters (not Bytes)
	{
		//if(p>=buff.length) throw "error";
		let s = "";
		for (let i = 0; i < l; i++) s += String.fromCharCode(buff[p + i]);
		return s;
	},
	readUnicode: function (buff, p, l) {
		//if(p>=buff.length) throw "error";
		let s = "";
		for (let i = 0; i < l; i++) {
			const c = (buff[p++] << 8) | buff[p++];
			s += String.fromCharCode(c);
		}
		return s;
	},
	_tdec: window["TextDecoder"] ? new window["TextDecoder"]() : null,
	readUTF8: function (buff, p, l) {
		const tdec = bin._tdec;
		if (tdec && p == 0 && l == buff.length) return tdec["decode"](buff);
		return bin.readASCII(buff, p, l);
	},
	readBytes: function (buff, p, l) {
		//if(p>=buff.length) throw "error";
		const arr = [];
		for (let i = 0; i < l; i++) arr.push(buff[p + i]);
		return arr;
	},
	readASCIIArray: function (buff, p, l)	// l : length in Characters (not Bytes)
	{
		//if(p>=buff.length) throw "error";
		const s = [];
		for (let i = 0; i < l; i++)
			s.push(String.fromCharCode(buff[p + i]));
		return s;
	}
};


bin.t = {
	buff: new ArrayBuffer(8),
};
bin.t.int8 = new Int8Array(bin.t.buff);
bin.t.uint8 = new Uint8Array(bin.t.buff);
bin.t.int16 = new Int16Array(bin.t.buff);
bin.t.uint16 = new Uint16Array(bin.t.buff);
bin.t.int32 = new Int32Array(bin.t.buff);
bin.t.uint32 = new Uint32Array(bin.t.buff);

export default bin;