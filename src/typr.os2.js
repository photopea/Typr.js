import bin from './typr.bin';

const os2 = {};

os2.parse = function (data, offset) {
	const ver = bin.readUshort(data, offset); offset += 2;

	const obj = {};
	if (ver == 0) os2.version0(data, offset, obj);
	else if (ver == 1) os2.version1(data, offset, obj);
	else if (ver == 2 || ver == 3 || ver == 4) os2.version2(data, offset, obj);
	else if (ver == 5) os2.version5(data, offset, obj);
	else throw "unknown OS/2 table version: " + ver;

	return obj;
}

os2.version0 = function (data, offset, obj) {
	obj.xAvgCharWidth = bin.readShort(data, offset); offset += 2;
	obj.usWeightClass = bin.readUshort(data, offset); offset += 2;
	obj.usWidthClass = bin.readUshort(data, offset); offset += 2;
	obj.fsType = bin.readUshort(data, offset); offset += 2;
	obj.ySubscriptXSize = bin.readShort(data, offset); offset += 2;
	obj.ySubscriptYSize = bin.readShort(data, offset); offset += 2;
	obj.ySubscriptXOffset = bin.readShort(data, offset); offset += 2;
	obj.ySubscriptYOffset = bin.readShort(data, offset); offset += 2;
	obj.ySuperscriptXSize = bin.readShort(data, offset); offset += 2;
	obj.ySuperscriptYSize = bin.readShort(data, offset); offset += 2;
	obj.ySuperscriptXOffset = bin.readShort(data, offset); offset += 2;
	obj.ySuperscriptYOffset = bin.readShort(data, offset); offset += 2;
	obj.yStrikeoutSize = bin.readShort(data, offset); offset += 2;
	obj.yStrikeoutPosition = bin.readShort(data, offset); offset += 2;
	obj.sFamilyClass = bin.readShort(data, offset); offset += 2;
	obj.panose = bin.readBytes(data, offset, 10); offset += 10;
	obj.ulUnicodeRange1 = bin.readUint(data, offset); offset += 4;
	obj.ulUnicodeRange2 = bin.readUint(data, offset); offset += 4;
	obj.ulUnicodeRange3 = bin.readUint(data, offset); offset += 4;
	obj.ulUnicodeRange4 = bin.readUint(data, offset); offset += 4;
	obj.achVendID = [bin.readInt8(data, offset), bin.readInt8(data, offset + 1), bin.readInt8(data, offset + 2), bin.readInt8(data, offset + 3)]; offset += 4;
	obj.fsSelection = bin.readUshort(data, offset); offset += 2;
	obj.usFirstCharIndex = bin.readUshort(data, offset); offset += 2;
	obj.usLastCharIndex = bin.readUshort(data, offset); offset += 2;
	obj.sTypoAscender = bin.readShort(data, offset); offset += 2;
	obj.sTypoDescender = bin.readShort(data, offset); offset += 2;
	obj.sTypoLineGap = bin.readShort(data, offset); offset += 2;
	obj.usWinAscent = bin.readUshort(data, offset); offset += 2;
	obj.usWinDescent = bin.readUshort(data, offset); offset += 2;
	return offset;
}

os2.version1 = function (data, offset, obj) {
	offset = os2.version0(data, offset, obj);

	obj.ulCodePageRange1 = bin.readUint(data, offset); offset += 4;
	obj.ulCodePageRange2 = bin.readUint(data, offset); offset += 4;
	return offset;
}

os2.version2 = function (data, offset, obj) {
	offset = os2.version1(data, offset, obj);

	obj.sxHeight = bin.readShort(data, offset); offset += 2;
	obj.sCapHeight = bin.readShort(data, offset); offset += 2;
	obj.usDefault = bin.readUshort(data, offset); offset += 2;
	obj.usBreak = bin.readUshort(data, offset); offset += 2;
	obj.usMaxContext = bin.readUshort(data, offset); offset += 2;
	return offset;
}

os2.version5 = function (data, offset, obj) {
	offset = os2.version2(data, offset, obj);

	obj.usLowerOpticalPointSize = bin.readUshort(data, offset); offset += 2;
	obj.usUpperOpticalPointSize = bin.readUshort(data, offset); offset += 2;
	return offset;
}

export default os2;