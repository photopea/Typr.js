var Untypr = {};


Untypr["T"] = {};

Untypr["T"].head = {
    encodeTab: function(obj)
    {
        var bin = Untypr["B"];
        bin.writeUint16(1); // majorVersion
        bin.writeUint16(0); // minorVersion
        bin.writeFixed(obj["fontRevision"]);
        var checkSumOffset = bin.getCurrentOffset(); // TODO
        bin.writeUint(0); // checkSumAdjustment
        bin.writeUint(0x5f0f3cf5); // magic constant
        bin.writeUint(obj["flags"]);
        bin.writeUshort(obj["unitsPerEm"]);
        bin.writeUint64(obj["created"]);
        bin.writeUint64(obj["modified"]);
        bin.writeShort(obj["xMin"]);
        bin.writeShort(obj["yMin"]);
        bin.writeShort(obj["xMax"]);
        bin.writeShort(obj["yMax"]);
        bin.writeUint16(obj["macStyle"]);
        bin.writeUint16(obj["lowestRecPPEM"]);
        bin.writeShort(obj["fontDirectionHint"]);
        bin.writeShort(obj["indexToLocFormat"]);
        bin.writeShort(obj["glyphDataFormat"]);
    }
};

Untypr["T"].hhea = {
    encodeTab: function(obj)
    {
        var bin = Untypr["B"];
        bin.writeUint16(1); // major version;
        bin.writeUint16(0); // minor version;

        var keys = ["ascender","descender","lineGap",
            "advanceWidthMax","minLeftSideBearing","minRightSideBearing","xMaxExtent",
            "caretSlopeRise","caretSlopeRun","caretOffset",
            undefined,undefined,undefined,undefined,
            "metricDataFormat","numberOfHMetrics" ];

        for(var i=0; i<keys.length; i++) {
            var key = keys[i];
            if (!key) bin.writeShort(0); // reserved
            else {
                var func = (key=="advanceWidthMax" || key=="numberOfHMetrics")?bin.writeUint16:bin.writeShort;
                func(obj[key]);
            }
        }
    }
};

Untypr["T"].hmtx = {
    encodeTab: function(obj)
    {
        var bin = Untypr["B"];
        var nH = obj["aWidth"].length;
        var nG = obj["lsBearing"].length;
        var i = 0;
        while (i<nH) {
            bin.writeUint16(obj["aWidth"][i]);
            bin.writeShort(obj["lsBearing"][i]);
            i++;
        }
        while (i<nG) {
            bin.writeShort(obj["lsBearing"][i]);
            i++;
        }
    }
}

Untypr["T"].maxp = {
    encodeTab: function(obj)
    {
        var bin = Untypr["B"];
        // FIXME: Typr doesn't store version information
        var ver = obj["version"] ? obj["version"] << 16 : 0x00005000
        bin.writeUint(ver);
        bin.writeUint16(obj["numGlyphs"]);

        if (ver == 0x00010000) {
            var keys = ["maxPoints", "maxContours", "maxCompositePoints", "maxCompositeContours",
            "maxZones", "maxTwilightPoints", "maxStorage", "maxFunctionDefs", "maxInstructionDefs",
            "maxStackElements", "maxSizeOfInstructions", "maxComponentElements", "maxComponentDepth"];

            for (var i=0; i<keys.length; i++) {
                bin.writeUint16(obj[keys[i]]);
            }
        }
    }
};

Untypr["T"].name = {
    encodeTab: function(obj)
    {
        var bin = Untypr["B"];
        // Typr doesn't support v1, so store only v0
        bin.writeShort(0);
        bin.writeShort(obj["count"]);
        bin.writeShort(0); // TODO: add offset

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

        var records = [];
        for (var key in Object.keys(obj)) {
            var match = key.match(/p(?<platformID>[0-9]+),(?<languageID>[0-9A-Fa-f]+)/)
            if (!match) continue;

            var pID = Number.parseInt(match.platformID, 10);
            var lID = Number.parseInt(match.languageID, 16);
            // FIXME: We just use Unicode or pick Roman and hope
            var encID;
            if (pID == 0) encID = 4; // Unicode, full Unicode
            else if (pID == 1) encID = 0; // Macintosh, Roman
            else if (pID == 3) encID = 10; // Windows, full Unicode

            for (var name in Object.keys(obj[key])) {
                var nID = names.indexOf(name);
                if (nID != -1) records.push({ pID, eID, lID, nID, key });
            }
        }

        // name records have to be sorted based on IDs
        records.sort((a, b) => {
            if (a.pID < b.pID) return -1;
            if (a.pID > b.pID) return 1;
            if (a.eID < b.eID) return -1;
            if (a.eID > b.eID) return 1;
            if (a.lID < b.lID) return -1;
            if (a.lID > b.lID) return 1;
            if (a.nID < b.nID) return -1;
            if (a.nID > b.nID) return 1;
            return 0;
        });

        for (var r of records) {
            bin.writeUint16(r.pID);
            bin.writeUint16(r.eID);
            bin.writeUint16(r.lID);
            bin.writeUint16(r.nID);
            bin.writeUint16(obj[r.key][names[r.nID]].length);
            bin.writeUint16(0); // TODO add offsets;
        }

        for (r of records) {
            var func = (r.pID == 1 && r.eID == 0) ? bin.writeASCII : bin.writeUnicode;
            func(obj[r.key][names[r.nID]]);
        }
    }
}

Untypr["T"].OS2 = {
    encodeTab: function(obj) {
        var bin = Untypr["B"];
        // Typr doesn't store table version, so we have to guess it from contents
        var version;
        if (obj.hasOwnProperty("usLowerOpticalPointSize")) version = 5;
        else if (obj.hasOwnProperty("sxHeight")) version = 2;
        else if (obj.hasOwnProperty("ulCodePageRange1")) version = 1;
        else version = 0;

        bin.writeUint16(version);
        bin.writeShort(obj["xAvgCharWidth"]);
        bin.writeUint16(obj["usWeightClass"]);
        bin.writeUint16(obj["usWidthClass"]);
        bin.writeUint16(obj["fsType"]);
        bin.writeShort(obj["ySubscriptXSize"]);
        bin.writeShort(obj["ySubscriptYSize"]);
        bin.writeShort(obj["ySubscriptXOffset"]);
        bin.writeShort(obj["ySubscriptYOffset"]);
        bin.writeShort(obj["ySuperscriptXSize"]);
        bin.writeShort(obj["ySuperscriptYSize"]);
        bin.writeShort(obj["ySuperscriptXOffset"]);
        bin.writeShort(obj["ySuperscriptYOffset"]);
        bin.writeShort(obj["yStrikeoutSize"]);
        bin.writeShort(obj["yStrikeoutPosition"]);
        bin.writeShort(obj["sFamilyClass"]);
        bin.writeBytes(obj["panose"]);
        bin.writeUint(obj["ulUnicodeRange1"]);
        bin.writeUint(obj["ulUnicodeRange2"]);
        bin.writeUint(obj["ulUnicodeRange3"]);
        bin.writeUint(obj["ulUnicodeRange4"]);
        bin.writeASCII(obj["achVendID"]);
        bin.writeUint16(obj["fsSelection"]);
        bin.writeUint16(obj["usFirstCharIndex"]);
        bin.writeUint16(obj["usLastCharIndex"]);
        bin.writeShort(obj["sTypoAscender"]);
        bin.writeShort(obj["sTypoDescender"]);
        bin.writeShort(obj["sTypoLineGap"]);
        bin.writeUint16(obj["usWinAscent"]);
        bin.writeUint16(obj["usWinDescent"]);

        if (version >= 1) {
            bin.writeUint(obj["ulCodePageRange1"]);
            bin.writeUint(obj["ulCodePageRange2"]);
        }

        if (version >= 2) {
            bin.writeShort(obj["sxHeight"]);
            bin.writeShort(obj["sCapHeight"]);
            bin.writeUint16(obj["usDefault"]);
            bin.writeUint16(obj["usBreak"]);
            bin.writeUint16(obj["usMaxContext"]);
        }

        if (version >= 5) {
            bin.writeUint16(obj["usLowerOpticalPointSize"]);
            bin.writeUint16(obj["usUpperOpticalPointSize"]);
        }
    }
}

Untypr["T"].post = {
    encodeTab: function(obj, offset, buff) {
        var bin = Untypr["B"];
        // We don't have the PS name information needed for v2, so we're storing as v3 only
        bin.writeUint(buff, offset, 0x00030000); offset += 4;
        bin.writeFixed(buff, offset, obj["italicAngle"]); offset += 4;
        bin.writeShort(buff, offset, obj["underlinePosition"]); offset +=2;
        bin.writeShort(buff, offset, obj["underlineThickness"]); offset += 2;
        // FIXME: Typr doesn't load "isFixedPitch"
        bin.writeUint(buff, offset, 0); offset += 4;
        bin.writeUint(buff, offset, 0); offset += 4; // minMemType42
        bin.writeUint(buff, offset, 0); offset += 4; // maxMemType42
        bin.writeUint(buff, offset, 0); offset += 4; // minMemType1
        bin.writeUint(buff, offset, 0); // maxMemType1
    }
}

Untypr["B"] = {
    writeUint: function(n)
    {
        this._out.push((n>>24)&255);
        this._out.push((n>>16)&255);
        this._out.push((n>>8)&255);
        this._out.push(n&255);
    },
    writeUint16: function(n)
    {
        this._out.push((n>>8)&255);
        this._out.push(n&255);
    },
    writeUint8: function(n)
    {
        this._out.push(n&255);
    },
    writeUint64: function(buff, p, n)
    {
        // TODO
    },
    writeInt: function(buff, p, n)
    {
        var a = Untypr["B"].t.uint8;
        Untypr["B"].t.int32[0] = n;
        this._out.push(a[3]);
        this._out.push(a[2]);
        this._out.push(a[1]);
        this._out.push(a[0]);
    },
    writeShort: function(buff, p, n)
    {
        var a = Untypr["B"].t.uint8;
        Untypr["B"].t.int16[0] = n;
        this._out.push(a[1]);
        this._out.push(a[0]);
    },
    writeInt8: function(buff, p, n)
    {
        var a = Untypr["B"].t.uint8;
        Untypr["B"].t.int8[0] = n;
        this._out.push(a[0]);
    },
    writeInt64: function(buff, p, n)
    {
        // TODO
    },
    writeF2dot14: function(buff, p, n)
    {
        Untypr["B"].writeShort(buff, p, n * 16384)
    },
    writeFixed: function(buff, p, n)
    {
        // TODO
    },
    writeBytes: function(arr)
    {
        for(var i=0; i<arr.length; i++) this._out.push(arr[i]);
    },
    writeASCII: function(s)
    {
        for(var i = 0; i < s.length; i++)
            this._out.push(s.charCodeAt(i));
    },
    writeUnicode: function(s)
    {
        var arr = new TextEncoder().encode(s);
        for (var i = 0; i < arr.length; i++) this._out.push(arr[i]);
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
    }(),
    _out: {
        arr: new Uint8Array(1000),
        offset: 0,
        write: function(byte, offset) {
            var out = Untypr["B"]._out;
            if (offset > out.offset) out.offset = offset;
            if (offset >= out.arr.length) {
                var ab = new ArrayBuffer(arr.length * 2);
                var newArr = new Uint8Array(ab);
                newArr.set(out.arr);
                out.arr = newArr;
            }
            out.arr[offset] = byte;
        },
        push: function(byte) { 
            var out = Untypr["B"]._out;
            out.write(byte, out.offset + 1);
        }
    },
    getCurrentOffset: function() {
        return Untypr["B"]._out.offset;
    }
};

