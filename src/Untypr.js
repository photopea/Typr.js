var Untypr = {};


Untypr["T"] = {};

Untypr["T"].head = {
    encodeTab: function(obj, offset, buff)
    {
        var bin = Typr["B"];
        bin.writeUint16(buff, offset, 1); offset += 2; // majorVersion
        bin.writeUint16(buff, offset, 0); offset += 2; // minorVersion
        bin.writeFixed(buff, offset, obj["fontRevision"]); offset += 4;
        var checkSumOffset = offset; // TODO
        bin.writeUint(buff, offset, 0); offset += 4; // checkSumAdjustment
        bin.writeUint(buff, offset, 0x5f0f3cf5); offset += 4; // magic constant
        bin.writeUint(buff, offset, obj["flags"]); offset += 2;
        bin.writeUshort(buff, offset, obj["unitsPerEm"]); offset += 2;
        bin.writeUint64(buff, offset, obj["created"]); offset += 8;
        bin.writeUint64(buff, offset, obj["modified"]); offset += 8;
        bin.writeShort(buff, offset, obj["xMin"]); offset += 2;
        bin.writeShort(buff, offset, obj["yMin"]); offset += 2;
        bin.writeShort(buff, offset, obj["xMax"]); offset += 2;
        bin.writeShort(buff, offset, obj["yMax"]); offset += 2;
        bin.writeUint16(buff, offset, obj["macStyle"]); offset += 2;
        bin.writeUint16(buff, offset, obj["lowestRecPPEM"]); offset += 2;
        bin.writeShort(buff, offset, obj["fontDirectionHint"]); offset += 2;
        bin.writeShort(buff, offset, obj["indexToLocFormat"]); offset += 2;
        bin.writeShort(buff, offset, obj["glyphDataFormat"]);
    }
}


Untypr["B"] = {
    writeUint: function(buff, p, n)
    {
        buff[p] = (n>>24)&255; buff[p+1] = (n>>16)&255; buff[p+2] = (n>>8)&255; buff[p+3] = n&255;
    },
    writeUint16: function(buff, p, n)
    {
        buff[p] = (n>>8)&255; buff[p+1] = n&255;
    },
    writeUint8: function(buff, p, n)
    {
        buff[p] = n&255;
    },
    writeUint64: function(buff, p, n)
    {
        // TODO
    },
    writeInt: function(buff, p, n)
    {
        var a = Typr["B"].t.uint8;
        Typr["B"].t.int32[0] = n;
        buff[p] = a[3];
        buff[p+1] = a[2];
        buff[p+2] = a[1];
        buff[p+3] = a[0];
    },
    writeShort: function(buff, p, n)
    {
        var a = Typr["B"].t.uint8;
        Typr["B"].t.int16[0] = n;
        buff[p] = a[1];
        buff[p+1] = a[0];
    },
    writeInt8: function(buff, p, n)
    {
        var a = Typr["B"].t.uint8;
        Typr["B"].t.int8[0] = n;
        buff[p] = a[0];
    },
    writeInt64: function(buff, p, n)
    {
        // TODO
    },
    writeF2dot14: function(buff, p, n)
    {
        Typr["B"].writeShort(buff, p, n * 16384)
    },
    writeFixed: function(buff, p, n)
    {
        // TODO
    },
    writeBytes: function(buff, p, arr)
    {
        for(var i=0; i<arr.length; i++) buff[p+i] = arr[i];
    },
    t : function() {
        var ab = new ArrayBuffer(8);
        return {
            buff   : ab,
            int8   : new Int8Array  (ab),
            uint8  : new Uint8Array (ab),
            int16  : new Int16Array (ab),
            uint16 : new Uint16Array(ab),
            int32  : new Int32Array (ab),
            uint32 : new Uint32Array(ab)
        }
    }()
}

