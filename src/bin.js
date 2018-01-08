_bin = {
  readFixed: function (data, o) {
    return ((data[o] << 8) | data[o + 1]) + (((data[o + 2] << 8) | data[o + 3]) / (256 * 256 + 4));
  },
  readF2dot14: function (data, o) {
    var num = _bin.readShort(data, o);
    return num / 16384;

    var intg = (num >> 14), frac = ((num & 0x3fff) / (0x3fff + 1));
    return (intg > 0) ? (intg + frac) : (intg - frac);
  },
  readInt: function (buff, p) {
    //if(p>=buff.length) throw "error";
    var a = _bin.t.uint8;
    a[0] = buff[p + 3];
    a[1] = buff[p + 2];
    a[2] = buff[p + 1];
    a[3] = buff[p];
    return _bin.t.int32[0];
  },

  readInt8: function (buff, p) {
    //if(p>=buff.length) throw "error";
    var a = _bin.t.uint8;
    a[0] = buff[p];
    return _bin.t.int8[0];
  },
  readShort: function (buff, p) {
    //if(p>=buff.length) throw "error";
    var a = _bin.t.uint8;
    a[1] = buff[p];
    a[0] = buff[p + 1];
    return _bin.t.int16[0];
  },
  readUshort: function (buff, p) {
    //if(p>=buff.length) throw "error";
    return (buff[p] << 8) | buff[p + 1];
  },
  readUshorts: function (buff, p, len) {
    var arr = [];
    for (var i = 0; i < len; i++) arr.push(_bin.readUshort(buff, p + i * 2));
    return arr;
  },
  readUint: function (buff, p) {
    //if(p>=buff.length) throw "error";
    var a = _bin.t.uint8;
    a[3] = buff[p];
    a[2] = buff[p + 1];
    a[1] = buff[p + 2];
    a[0] = buff[p + 3];
    return _bin.t.uint32[0];
  },
  readUint64: function (buff, p) {
    //if(p>=buff.length) throw "error";
    return (_bin.readUint(buff, p) * (0xffffffff + 1)) + _bin.readUint(buff, p + 4);
  },
  readASCII: function (buff, p, l)	// l : length in Characters (not Bytes)
  {
    //if(p>=buff.length) throw "error";
    var s = "";
    for (var i = 0; i < l; i++) s += String.fromCharCode(buff[p + i]);
    return s;
  },
  readUnicode: function (buff, p, l) {
    //if(p>=buff.length) throw "error";
    var s = "";
    for (var i = 0; i < l; i++) {
      var c = (buff[p++] << 8) | buff[p++];
      s += String.fromCharCode(c);
    }
    return s;
  },
  readBytes: function (buff, p, l) {
    //if(p>=buff.length) throw "error";
    var arr = [];
    for (var i = 0; i < l; i++) arr.push(buff[p + i]);
    return arr;
  },
  readASCIIArray: function (buff, p, l)	// l : length in Characters (not Bytes)
  {
    //if(p>=buff.length) throw "error";
    var s = [];
    for (var i = 0; i < l; i++)
      s.push(String.fromCharCode(buff[p + i]));
    return s;
  }
};

var ab = new ArrayBuffer(8);
_bin.t = {};
_bin.t.int8 = new Int8Array(ab);
_bin.t.uint8 = new Uint8Array(ab);
_bin.t.int16 = new Int16Array(ab);
_bin.t.uint16 = new Uint16Array(ab);
_bin.t.int32 = new Int32Array(ab);
_bin.t.uint32 = new Uint32Array(ab);

module.exports = _bin;