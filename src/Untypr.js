var Untypr = {};


Untypr["T"] = {};

Untypr["T"].head = {
    encodeTab: function(obj, offset, buff)
    {
        var bin = Untypr["B"];
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
};

Untypr["T"].hhea = {
    encodeTab: function(obj, offset, buff)
    {
        var bin = Untypr["B"];
        bin.writeUint16(buff, offset, 1); offset += 2;// major version;
        bin.writeUint16(buff, offset, 0); offset += 2;// minor version;

        var keys = ["ascender","descender","lineGap",
            "advanceWidthMax","minLeftSideBearing","minRightSideBearing","xMaxExtent",
            "caretSlopeRise","caretSlopeRun","caretOffset",
            undefined,undefined,undefined,undefined,
            "metricDataFormat","numberOfHMetrics" ];

        for(var i=0; i<keys.length; i++) {
            var key = keys[i];
            if (!key) bin.writeShort(buff,offset+i*2,0); // reserved
            else {
                var func = (key=="advanceWidthMax" || key=="numberOfHMetrics")?bin.writeUint16:bin.writeShort;
                func(buff, offset+i*2, obj[key]);
            }
        }
    }
};

Untypr["T"].hmtx = {
    encodeTab: function(obj, offset, buff)
    {
        var bin = Untypr["B"];
        var nH = obj["aWidth"].length;
        var nG = obj["lsBearing"].length;
        var i = 0;
        while (i<nH) {
            bin.writeUint16(buff, offset, obj["aWidth"][i]); offset += 2;
            bin.writeShort(buff, offset, obj["lsBearing"][i]); offset += 2;
            i++;
        }
        while (i<nG) {
            bin.writeShort(buff, offset, obj["lsBearing"][i]); offset += 2;
            i++;
        }
    }
}

Untypr["T"].maxp = {
    encodeTab: function(obj, offset, buff)
    {
        var bin = Untypr["B"];
        // FIXME: Typr doesn't store version information
        var ver = obj["version"] ? obj["version"] << 16 : 0x00005000
        bin.writeUint(buff, offset, ver); offset += 4;
        bin.writeUint16(buff, offset, obj["numGlyphs"]);

        if (ver == 0x00010000) {
            var keys = ["maxPoints", "maxContours", "maxCompositePoints", "maxCompositeContours",
            "maxZones", "maxTwilightPoints", "maxStorage", "maxFunctionDefs", "maxInstructionDefs",
            "maxStackElements", "maxSizeOfInstructions", "maxComponentElements", "maxComponentDepth"];

            for (var i=0; i<keys.length; i++) {
                bin.writeUint16(buff, offset, obj[keys[i]]); offset += 2;
            }
        }
    }
};

Untypr["T"].name = {
    encodeTab: function(obj, offset, buff)
    {
        var bin = Untypr["B"];
        // Typr doesn't support v1, so store only v0
        bin.writeShort(buff, offset, 0); offset += 2;
        bin.writeShort(buff, offset, obj["count"]); offset += 2;
        bin.writeShort(buff, offset, 0); // TODO: add offset

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
            bin.writeUint16(buff, offset, r.pID); offset += 2;
            bin.writeUint16(buff, offset, r.eID); offset += 2;
            bin.writeUint16(buff, offset, r.lID); offset += 2;
            bin.writeUint16(buff, offset, r.nID); offset += 2;
            bin.writeUint16(buff, offset, obj[r.key][names[r.nID]].length); offset += 2;
            bin.writeUint16(buff, offset, 0); offset += 2; // TODO add offsets;
        }

        for (r of records) {
            var func = (r.pID == 1 && r.eID == 0) ? bin.writeASCII : bin.writeUnicode;
            func(buff, offset, obj[r.key][names[r.nID]]);
        }
    }
}

Untypr["T"].OS2 = {
    encodeTab: function(obj, offset, buff) {
        var bin = Untypr["B"];
        // Typr doesn't store table version, so we have to guess it from contents
        var version;
        if (obj.hasOwnProperty("usLowerOpticalPointSize")) version = 5;
        else if (obj.hasOwnProperty("sxHeight")) version = 2;
        else if (obj.hasOwnProperty("ulCodePageRange1")) version = 1;
        else version = 0;

        bin.writeUint16(buff, offset, version); offset += 2;
        bin.writeShort(buff, offset, obj["xAvgCharWidth"]); offset += 2;
        bin.writeUint16(buff, offset, obj["usWeightClass"]); offset += 2;
        bin.writeUint16(buff, offset, obj["usWidthClass"]); offset += 2;
        bin.writeUint16(buff, offset, obj["fsType"]); offset += 2;
        bin.writeShort(buff, offset, obj["ySubscriptXSize"]); offset += 2;
        bin.writeShort(buff, offset, obj["ySubscriptYSize"]); offset += 2;
        bin.writeShort(buff, offset, obj["ySubscriptXOffset"]); offset += 2;
        bin.writeShort(buff, offset, obj["ySubscriptYOffset"]); offset += 2;
        bin.writeShort(buff, offset, obj["ySuperscriptXSize"]); offset += 2;
        bin.writeShort(buff, offset, obj["ySuperscriptYSize"]); offset += 2;
        bin.writeShort(buff, offset, obj["ySuperscriptXOffset"]); offset += 2;
        bin.writeShort(buff, offset, obj["ySuperscriptYOffset"]); offset += 2;
        bin.writeShort(buff, offset, obj["yStrikeoutSize"]); offset += 2;
        bin.writeShort(buff, offset, obj["yStrikeoutPosition"]); offset += 2;
        bin.writeShort(buff, offset, obj["sFamilyClass"]); offset += 2;
        bin.writeBytes(buff, offset, obj["panose"]);  offset += 10;
        bin.writeUint(buff, offset, obj["ulUnicodeRange1"]);  offset += 4;
        bin.writeUint(buff, offset, obj["ulUnicodeRange2"]);  offset += 4;
        bin.writeUint(buff, offset, obj["ulUnicodeRange3"]);  offset += 4;
        bin.writeUint(buff, offset, obj["ulUnicodeRange4"]);  offset += 4;
        bin.writeASCII(buff, offset, obj["achVendID"]);  offset += 4;
        bin.writeUint16(buff, offset, obj["fsSelection"]); offset += 2;
        bin.writeUint16(buff, offset, obj["usFirstCharIndex"]); offset += 2;
        bin.writeUint16(buff, offset, obj["usLastCharIndex"]); offset += 2;
        bin.writeShort(buff, offset, obj["sTypoAscender"]); offset += 2;
        bin.writeShort(buff, offset, obj["sTypoDescender"]); offset += 2;
        bin.writeShort(buff, offset, obj["sTypoLineGap"]); offset += 2;
        bin.writeUint16(buff, offset, obj["usWinAscent"]); offset += 2;
        bin.writeUint16(buff, offset, obj["usWinDescent"]); offset += 2;

        if (version >= 1) {
            bin.writeUint(buff, offset, obj["ulCodePageRange1"]); offset += 4;
            bin.writeUint(buff, offset, obj["ulCodePageRange2"]); offset += 4;
        }

        if (version >= 2) {
            bin.writeShort(buff, offset, obj["sxHeight"]); offset += 2;
            bin.writeShort(buff, offset, obj["sCapHeight"]); offset += 2;
            bin.writeUint16(buff, offset, obj["usDefault"]); offset += 2;
            bin.writeUint16(buff, offset, obj["usBreak"]); offset += 2;
            bin.writeUint16(buff, offset, obj["usMaxContext"]); offset += 2;
        }

        if (version >= 5) {
            bin.writeUint16(buff, offset, obj["usLowerOpticalPointSize"]); offset += 2;
            bin.writeUint16(buff, offset, obj["usUpperOpticalPointSize"]);
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
        var a = Untypr["B"].t.uint8;
        Untypr["B"].t.int32[0] = n;
        buff[p] = a[3];
        buff[p+1] = a[2];
        buff[p+2] = a[1];
        buff[p+3] = a[0];
    },
    writeShort: function(buff, p, n)
    {
        var a = Untypr["B"].t.uint8;
        Untypr["B"].t.int16[0] = n;
        buff[p] = a[1];
        buff[p+1] = a[0];
    },
    writeInt8: function(buff, p, n)
    {
        var a = Untypr["B"].t.uint8;
        Untypr["B"].t.int8[0] = n;
        buff[p] = a[0];
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
    writeBytes: function(buff, p, arr)
    {
        for(var i=0; i<arr.length; i++) buff[p+i] = arr[i];
    },
    writeASCII: function(buff, p, s)
    {
        for(var i = 0; i < s.length; i++)
            buff[p+i] = s.charCodeAt(i);
    },
    writeUnicode: function(buff, p, s)
    {
        var arr = new TextEncoder().encode(s);
        for (var i = 0; i < arr.length; i++) buff[p+i] = arr[i];
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
};

