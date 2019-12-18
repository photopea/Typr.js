import bin from './typr.bin';

/* eslint-disable no-unused-vars */

const maxp = {};

maxp.parse = function (data, offset, length) {
	const obj = {};

	// both versions 0.5 and 1.0
	const ver = bin.readUint(data, offset); offset += 4;
	obj.numGlyphs = bin.readUshort(data, offset); offset += 2;

	// only 1.0
	if (ver == 0x00010000) {
		obj.maxPoints = bin.readUshort(data, offset); offset += 2;
		obj.maxContours = bin.readUshort(data, offset); offset += 2;
		obj.maxCompositePoints = bin.readUshort(data, offset); offset += 2;
		obj.maxCompositeContours = bin.readUshort(data, offset); offset += 2;
		obj.maxZones = bin.readUshort(data, offset); offset += 2;
		obj.maxTwilightPoints = bin.readUshort(data, offset); offset += 2;
		obj.maxStorage = bin.readUshort(data, offset); offset += 2;
		obj.maxFunctionDefs = bin.readUshort(data, offset); offset += 2;
		obj.maxInstructionDefs = bin.readUshort(data, offset); offset += 2;
		obj.maxStackElements = bin.readUshort(data, offset); offset += 2;
		obj.maxSizeOfInstructions = bin.readUshort(data, offset); offset += 2;
		obj.maxComponentElements = bin.readUshort(data, offset); offset += 2;
		obj.maxComponentDepth = bin.readUshort(data, offset); offset += 2;
	}

	return obj;
}

export default maxp;