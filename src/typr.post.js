import bin from './typr.bin';

const post = {};

post.parse = function (data, offset) {
	const obj = {};

	obj.version = bin.readFixed(data, offset); offset += 4;
	obj.italicAngle = bin.readFixed(data, offset); offset += 4;
	obj.underlinePosition = bin.readShort(data, offset); offset += 2;
	obj.underlineThickness = bin.readShort(data, offset); offset += 2;

	return obj;
}

export default post;