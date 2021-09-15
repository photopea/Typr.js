var Untypr = {};

Untypr["encode"] = function(font) {
    var T = Untypr["T"];
    var encoders = {
        head: T.head,
        cmap: T.cmap,
        hhea: T.hhea,
        maxp: T.maxp,
        hmtx: T.hmtx,
        name: T.name,
        "OS/2": T.OS2,
        post: T.post,
        glyf: T.glyf,
        loca: T.loca,
        kern: T.kern,
        SVG: T.SVG,
    };

    var toEncode = {};
    var bin = Untypr["B"];
    bin._out.clear();
    var numTables = 0;
    for (var enc in encoders) {
        if (font.hasOwnProperty(enc)) {
            numTables++;
            toEncode[enc] = encoders[enc];
        }
    }
    var searchRange = 1;
    var entrySelector = 0;
    while (searchRange < numTables) {
        searchRange <<= 1;
        entrySelector += 1;
    }
    searchRange <<= 3; // /2 * 16
    entrySelector -= 1;
    var rangeShift = (numTables << 4) - searchRange;

    // table directory
    bin.writeUint(0x00010000); // sfntVersion
    bin.writeUint16(numTables);
    bin.writeUint16(searchRange);
    bin.writeUint16(entrySelector);
    bin.writeUint16(rangeShift);

    // table records
    var tableRecordOffsets = {};
    for (var tableTag in toEncode) {
        tableRecordOffsets[tableTag] = bin.getCurrentOffset();
        bin.writeASCII(tableTag);
        bin.writeUint(0); // checksum
        bin.writeUint(0); // offset
        bin.writeUint(0); // length
    }

    // tables themselves
    var tableOffsets = {};
    var metadata = {};
    for (var tableTag in toEncode) {
        var tableStartOffset = bin.getCurrentOffset();
        toEncode[tableTag].encodeTab(font[tableTag], font, metadata);
        var tableEndOffset = bin.getCurrentOffset();
        tableOffsets[tableTag] = { start: tableStartOffset, end: tableEndOffset };
        while (bin.getCurrentOffset() % 4 != 0) {
            // tables must be aligned to 4 byte boundaries
            bin.writeUint8(0);
        }
    }

    // compute record fields
    for (var tableTag in toEncode) {
        var off = tableRecordOffsets[tableTag];
        var lim = tableOffsets[tableTag];
        var checksum = Untypr["getChecksum"](lim.start, lim.end);
        bin.writeUint(checksum, off+4);
        bin.writeUint(lim.start, off+8);
        bin.writeUint(lim.end - lim.start, off+12);
    }

    // compute total font checksum and write adjustment to "head"
    var totalChksm = Untypr["getChecksum"](0, bin.getCurrentOffset());
    var chksmAdjust = 0xb1b0afba - totalChksm;
    bin.writeUint(chksmAdjust, tableOffsets["head"].start + 8);

    // clip returned ArrayBuffer
    var returnArr = new Uint8Array(bin._out.length);
    returnArr.set(new Uint8Array(bin._out.arr.buffer, 0, bin._out.length));
    return returnArr.buffer;
}

Untypr["getChecksum"] = function(start, end) {
    while (end % 4 != 0) end++;
    var sum = 0;
    for (var i = start; i < end; i += 4) {
        sum = (sum + Untypr["B"].readUint(i)) >>> 0; // simulate uint overflow
    }
    return sum;
}

Untypr["T"] = {};

Untypr["T"].head = {
    encodeTab: function(obj)
    {
        var bin = Untypr["B"];
        bin.writeUint16(1); // majorVersion
        bin.writeUint16(0); // minorVersion
        bin.writeFixed(obj["fontRevision"]);
        bin.writeUint(0); // checkSumAdjustment
        bin.writeUint(0x5f0f3cf5); // magic constant
        bin.writeUint16(obj["flags"]);
        bin.writeUint16(obj["unitsPerEm"]);
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
        // FIXME: Typr doesn't store version information, assume v0.5
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
        var startOffset = bin.getCurrentOffset();
        bin.writeShort(0);
        bin.writeShort(0); // count
        bin.writeShort(0); // storageOffset

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

        // We just use Unicode
        var pID = 0; // Unicode
        var eID = 4; // Unicode full repertoire
        var lID = 0;

        var nameIDs = [];
        for (var name of Object.keys(obj)) {
            var nID = names.indexOf(name);
            if (nID != -1) nameIDs.push(nID);
        }
        bin.writeUint16(nameIDs.length, startOffset + 2);
        var fillIns = [];
        for (var nameID of nameIDs) {
            bin.writeUint16(pID);
            bin.writeUint16(eID);
            bin.writeUint16(lID);
            bin.writeUint16(nameID);
            fillIns.push(bin.getCurrentOffset());
            bin.writeUint16(0); // length
            bin.writeUint16(0); // offset;
        }

        var dataOffset = bin.getCurrentOffset();
        bin.writeUint16(dataOffset - startOffset, startOffset + 4);

        for (var i = 0; i < nameIDs.length; i++) {
            var strStartOffset = bin.getCurrentOffset();
            bin.writeUint16(strStartOffset - dataOffset, fillIns[i] + 2);
            bin.writeUnicode(obj[names[nameIDs[i]]]);
            bin.writeUint16(bin.getCurrentOffset() - strStartOffset, fillIns[i]);
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
    encodeTab: function(obj) {
        var bin = Untypr["B"];
        // We don't have the PS name information needed for v2, so we're storing as v3 only
        bin.writeUint(0x00030000);
        bin.writeFixed(obj["italicAngle"]);
        bin.writeShort(obj["underlinePosition"]);
        bin.writeShort(obj["underlineThickness"]);
        // FIXME: Typr doesn't load "isFixedPitch"
        bin.writeUint(0); // isFixedPitch
        bin.writeUint(0); // minMemType42
        bin.writeUint(0); // maxMemType42
        bin.writeUint(0); // minMemType1
        bin.writeUint(0); // maxMemType1
    }
}

Untypr["T"].cmap = {
    encodeTab: function(obj) {
        var bin = Untypr["B"];
        var startOffset = bin.getCurrentOffset();
        bin.writeUint16(0); // version
        bin.writeUint16(obj.tables.length); // numTables

        var headerOffsetFields = {};
        for (var key of Object.keys(obj.ids)) {
            var match = key.match(/^p(?<platformID>[0-9]+)e(?<encodingID>[0-9]+)$/);
            if (!match) continue;
            var pID = Number.parseInt(match.groups.platformID);
            var eID = Number.parseInt(match.groups.encodingID);
            bin.writeUint16(pID);
            bin.writeUint16(eID);
            headerOffsetFields[key] = bin.getCurrentOffset();
            bin.writeUint(0); // subtableOffset
        }

        var offsets = [];
        for (var subt of obj.tables) {
            offsets.push(bin.getCurrentOffset() - startOffset);
            if (subt.format == 0) this.encode0(subt);
            else if (subt.format == 4) this.encode4(subt);
            else if (subt.format == 6) this.encode6(subt);
            else if (subt.format == 12) this.encode12(subt);
            // else console.log(`unknown subtable format ${subt.format}`);
        }

        // fill in record offsets
        for (var field of Object.keys(headerOffsetFields)) {
            bin.writeUint(offsets[obj.ids[field]], headerOffsetFields[field]);
        }
    },

    encode0: function(table) {
        var bin = Untypr["B"];
        bin.writeUint16(0); // format
        bin.writeUint16(table.map.length + 6); // length
        bin.writeUint16(0) // language, FIXME: we assume not language-specific on Mac
        for (var glyphId of table.map) {
            bin.writeUint8(glyphId);
        }
    },
    encode4: function(table) {
        var bin = Untypr["B"];
        bin.writeUint16(4); // format
        var segCount = table.startCount.length;
        var length = (8 + (segCount<<2) + table.glyphIdArray.length) << 1;
        bin.writeUint16(length);
        bin.writeUint16(0); // language, FIXME: we assume not language-specific on Mac
        bin.writeUint16(segCount<<1); // segCountX2
        bin.writeUint16(table.searchRange);
        bin.writeUint16(table.entrySelector);
        bin.writeUint16(table.rangeShift);
        for (var endCount of table.endCount) {
            bin.writeUint16(endCount);
        }
        bin.writeUint16(0); // reservedPad
        for (var startCount of table.startCount) {
            bin.writeUint16(startCount);
        }
        for (var idDelta of table.idDelta) {
            bin.writeUint16(idDelta);
        }
        for (var idRangeOffset of table.idRangeOffset) {
            bin.writeUint16(idRangeOffset);
        }
        for (var glyphID of table.glyphIdArray) {
            bin.writeUint16(glyphID);
        }
    },
    encode6: function(table) {
        var bin = Untypr["B"];
        bin.writeUint16(6); // format
        var length = (table.glyphIdArray.length + 5)<<1;
        bin.writeUint16(length);
        bin.writeUint16(0); // FIXME assumes language-independent encoding
        bin.writeUint16(table.firstCode);
        bin.writeUint16(table.glyphIdArray.length); // entryCount
        for (var id of table.glyphIdArray) bin.writeUint16(id);
    },
    encode12: function(table) {
        var bin = Untypr["B"];
        bin.writeUint16(12); // format
        bin.writeUint16(0); // reserved
        var length = 16 + (table.groups.length<<2);
        bin.writeUint(length);
        bin.writeUint(0); // language
        bin.writeUint(table.groups.length / 3); // numGroups
        for (var group of table.groups) {
            bin.writeUint(group);
        }
    },
}

Untypr["T"].loca = {
    encodeTab: function(obj, font, metadata) {
        var bin = Untypr["B"];
        var version = font["head"]["indexToLocFormat"];
        if (version == 0) for (var short of metadata.glyfOffsets) bin.writeUint16(short >> 1);
        if (version == 1) for (var long of metadata.glyfOffsets) bin.writeUint(long);
    }
}

Untypr["T"].kern = {
    encodeTab: function(obj) {
        var bin = Untypr["B"];
        var nPairs = obj.rval.reduceRight((n, o) => n + o.vals.length, 0);
        bin.writeUint16(0); // version
        // FIXME Typr combines all subtables into one map, so we just write one subtable
        bin.writeUint16(obj.glyph1.length > 0 ? 1 : 0);

        bin.writeUint16(0); // subtable version
        var length = 6 * nPairs + 14;
        bin.writeUint16(length);
        // FIXME Typr doesn't store coverage data for kerning subtables
        bin.writeUint16(0x0000); // coverage
        bin.writeUint16(nPairs);
        var searchRange = 1;
        var entrySelector = 0;
        while (searchRange < nPairs)
        {
            searchRange <<= 1;
            entrySelector += 1;
        }
        searchRange >>= 1; entrySelector -= 1;
        var rangeShift = nPairs - searchRange;
        bin.writeUint16(searchRange * 6);
        bin.writeUint16(entrySelector);
        bin.writeUint16(rangeShift * 6);
        for (var i = 0; i < obj.glyph1.length; i++) {
            var g1 = obj.glyph1[i];
            var rval = obj.rval[i];
            for (var j = 0; j < rval.glyph2.length; j++) {
                bin.writeUint16(g1);
                bin.writeUint16(rval.glyph2[j]);
                bin.writeShort(rval.vals[j]);
            }
        }
    }
}

Untypr["T"].glyf = {
    encodeTab: function(obj, font, metadata) {
        // FIXME glyphs are parsed lazily. This will encode only those parsed
        var bin = Untypr["B"];
        var glyfStartOffset = bin.getCurrentOffset();
        var offsets = [];
        for (var i = 0; i < obj.length; i++) {
            var glyph = obj[i];
            offsets.push(bin.getCurrentOffset() - glyfStartOffset);
            if (!glyph) {
                continue;
            }
            bin.writeShort(glyph.noc);
            bin.writeShort(glyph.xMin);
            bin.writeShort(glyph.yMin);
            bin.writeShort(glyph.xMax);
            bin.writeShort(glyph.yMax);
            if (glyph.noc >= 0) this.encodeSimpleGlyph(glyph);
            else this.encodeCompositeGlyph(glyph);
        }

        metadata.glyfOffsets = offsets;
    },
    encodeSimpleGlyph: function(glyph) {
        var bin = Untypr["B"];
        for (var endPt of glyph.endPts) {
            bin.writeUint16(endPt);
        }
        bin.writeUint16(glyph.instructions.length);
        for (var inst of glyph.instructions) {
            bin.writeUint8(inst);
        }

        var xs = [glyph.xs[0]];
        for (var i = 1; i < glyph.xs.length; i++) {
            xs[i] = glyph.xs[i] - glyph.xs[i-1];
        }

        var ys = [glyph.ys[0]];
        for (var i = 1; i < glyph.ys.length; i++) {
            ys[i] = glyph.ys[i] - glyph.ys[i-1];
        }

        var fs = [];
        for (var i = 0; i < glyph.flags.length; i++) {
            var f = glyph.flags[i] & 0x01;
            if (i > 0 && xs[i] == 0) {
                f |= 0x10;
            } else if (xs[i] <= 255 && xs[i] >= -255) {
                f |= 0x02;
                if (xs[i] >= 0) f |= 0x10;
            }

            if (i > 0 && ys[i] == 0) {
                f |= 0x20;
            } else if (ys[i] <= 255 && ys[i] >= -255) {
                f |= 0x04;
                if (ys[i] >= 0) f |= 0x20;
            }

            fs.push(f);
        }

        for (var flag of fs) bin.writeUint8(flag);
        for (var i = 0; i < xs.length; i++) {
            var x = xs[i];
            if (i > 0 && x == 0) continue;
            if (x >= -255 && x <= 255) bin.writeUint8(x >= 0 ? x : -x);
            else bin.writeShort(x);
        }

        for (var i = 0; i < ys.length; i++) {
            var y = ys[i];
            if (i > 0 && y == 0) continue;
            if (y >= -255 && y <= 255) bin.writeUint8(y >= 0 ? y : -y);
            else bin.writeShort(y);
        }
    },
    encodeCompositeGlyph: function(glyph) {
        var bin = Untypr["B"];
        var ARG_1_AND_2_ARE_WORDS	= 1<<0;
        var ARGS_ARE_XY_VALUES		= 1<<1;
        var WE_HAVE_A_SCALE			= 1<<3;
        var MORE_COMPONENTS			= 1<<5;
        var WE_HAVE_AN_X_AND_Y_SCALE= 1<<6;
        var WE_HAVE_A_TWO_BY_TWO	= 1<<7;
        var WE_HAVE_INSTRUCTIONS	= 1<<8;

        for (var i = 0; i < glyph.parts.length; i++) {
            var part = glyph.parts[i];
            // determine flags and arguments
            var flags = 0;
            var arg1, arg2;
            if (part.p1 == -1 && part.p2 == -1) {
                arg1 = part.m.tx; arg2 = part.m.ty;
                flags |= ARGS_ARE_XY_VALUES;
                if (arg1 >= 128 || arg1 < -128 || arg2 >= 128 || arg2 < -128)
                    flags |= ARG_1_AND_2_ARE_WORDS;
            } else {
                arg1 = part.p1; arg2 = part.p2;
                if (arg1 > 256 || arg2 > 256)
                    flags |= ARG_1_AND_2_ARE_WORDS;
            }

            if (part.m.a == 1 && part.m.b == 0 && part.m.c == 0 && part.m.d == 1)
                flags |= 0;
            else if (part.m.a == part.m.d && part.m.b == 0 && part.m.c == 0)
                flags |= WE_HAVE_A_SCALE;
            else if (part.m.b == 0 && part.m.c == 0)
                flags |= WE_HAVE_AN_X_AND_Y_SCALE;
            else
                flags |= WE_HAVE_A_TWO_BY_TWO;

            if (i == glyph.parts.length - 1) {
                if (glyph.instr && glyph.instr.length > 0)
                    flags |= WE_HAVE_INSTRUCTIONS;
            } else {
                flags |= MORE_COMPONENTS;
            }

            // write glyph component
            bin.writeUint16(flags);
            bin.writeUint16(part.glyphIndex);
            if (flags & ARG_1_AND_2_ARE_WORDS) {
                bin.writeUint16(arg1);
                bin.writeUint16(arg2);
            } else {
                bin.writeUint16((arg1 << 8) | arg2);
            }

            if (flags & WE_HAVE_A_SCALE) {
                bin.writeF2dot14(part.m.a);
            } else if (flags & WE_HAVE_AN_X_AND_Y_SCALE) {
                bin.writeF2dot14(part.m.a);
                bin.writeF2dot14(part.m.d);
            } else if (flags & WE_HAVE_A_TWO_BY_TWO) {
                bin.writeF2dot14(part.m.a);
                bin.writeF2dot14(part.m.b);
                bin.writeF2dot14(part.m.c);
                bin.writeF2dot14(part.m.d);
            }
        }

        if (glyph.instr && glyph.instr.length > 0) {
            bin.writeUint16(glyph.instr.length);
            for (var instr of glyph.instr) {
                bin.writeUint8(instr);
            }
        }
    }
}

Untypr["T"].SVG = {
    encodeTab: function(obj) {
        var bin = Untypr["B"];
        bin.writeUint16(0); // version
        bin.writeUint(10); // svgDocumentListOffset
        bin.writeUint(0); // reserved

        // convert entries array into ranges
        var ranges = [];
        var svgs = [];
        var currStart = -1;
        var currSvg;
        for (var i = 0; i < obj.entries.length; i++) {
            if (typeof currSvg == "undefined" && typeof obj.entries[i] == "undefined") {
                continue;
            }
            if (typeof currSvg == "undefined") {
                currStart = i;
                currSvg = obj.entries[i];
            }
            if (obj.entries[i] != currSvg) {
                ranges.push([currStart, i-1]);
                svgs.push(currSvg);
                currSvg = obj.entries[i];
                currStart = i;
            }
        }

        var documentListOffset = bin.getCurrentOffset();
        var offsets = [];
        bin.writeUint16(ranges.length); // numEntries
        for (var range of ranges) {
            bin.writeUint16(range[0]); // startGlyphID
            bin.writeUint16(range[1]); // endGlyphID
            offsets.push(bin.getCurrentOffset());
            bin.writeUint(0); // svgDocOffset
            bin.writeUint(0); // svgDocLength
        }

        for (var i = 0; i < svgs.length; i++) {
            var startDocOffset = bin.getCurrentOffset();
            bin.writeUnicode(svgs[i]);
            var endDocOffset = bin.getCurrentOffset();
            bin.writeUint(startDocOffset - documentListOffset, offsets[i]);
            bin.writeUint(endDocOffset - startDocOffset, offsets[i] + 4);
        }
    }
}

Untypr["B"] = {
    readUint : function(p)
    {
        var buff = Untypr["B"]._out.arr;
        var a = Untypr["B"].t.uint8;
        a[3] = buff[p];  a[2] = buff[p+1];  a[1] = buff[p+2];  a[0] = buff[p+3];
        return Untypr["B"].t.uint32[0];
    },
    writeUint: function(n, p)
    {
        Untypr["B"]._out.write((n>>24)&255, p);
        Untypr["B"]._out.write((n>>16)&255, p+1);
        Untypr["B"]._out.write((n>>8)&255, p+2);
        Untypr["B"]._out.write(n&255, p+3);
    },
    writeUint16: function(n, p)
    {
        Untypr["B"]._out.write((n>>8)&255, p);
        Untypr["B"]._out.write(n&255, p+1);
    },
    writeUint8: function(n, p)
    {
        Untypr["B"]._out.write(n&255, p);
    },
    writeUint64: function(n, p)
    {
        Untypr["B"].writeUint(Number(BigInt(n) >> BigInt(32)), p);
        Untypr["B"].writeUint(n & 0xffffffff, p+1);
    },
    writeInt: function(n, p)
    {
        var a = Untypr["B"].t.uint8;
        Untypr["B"].t.int32[0] = n;
        Untypr["B"]._out.write(a[3], p);
        Untypr["B"]._out.write(a[2], p+1);
        Untypr["B"]._out.write(a[1], p+2);
        Untypr["B"]._out.write(a[0], p+3);
    },
    writeShort: function(n, p)
    {
        var a = Untypr["B"].t.uint8;
        Untypr["B"].t.int16[0] = n;
        Untypr["B"]._out.write(a[1], p);
        Untypr["B"]._out.write(a[0], p+1);
    },
    writeF2dot14: function(n, p)
    {
        Untypr["B"].writeShort(n * 16384, p)
    },
    writeFixed: function(n, p)
    {
        Untypr["B"].writeInt(n * 65536, p);
    },
    writeBytes: function(arr, p)
    {
        for(var i=0; i<arr.length; i++) Untypr["B"]._out.write(arr[i], p+i);
    },
    writeASCII: function(s, p)
    {
        for(var i = 0; i < s.length; i++)
            Untypr["B"]._out.write(s.charCodeAt(i), p+i);
    },
    writeUnicode: function(s, p)
    {
        for (var i = 0; i < s.length; i++)
            Untypr["B"].writeUint16(s.charCodeAt(i), p+i);
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
            uint32 : new Uint32Array(ab),
        }
    }(),
    _out: {
        arr: new Uint8Array(1000),
        length: 0,
        write: function(byte, offset) {
            var out = Untypr["B"]._out;
            if (!Number.isFinite(offset)) offset = out.length;
            if (offset >= out.length) out.length = offset + 1;
            while (out.length > out.arr.length) {
                var newArr = new Uint8Array(out.arr.length * 2);
                newArr.set(out.arr);
                out.arr = newArr;
            }
            out.arr[offset] = byte;
        },
        clear: function() {
            var out = Untypr["B"]._out;
            out.arr = new Uint8Array(1000);
            out.length = 0;
        }
    },
    getCurrentOffset: function() {
        return Untypr["B"]._out.length;
    }
};
