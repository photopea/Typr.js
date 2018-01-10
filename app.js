// Require modules
const fs = require('fs');
const Typr = require('./index.js');
const Canvas = require('canvas');

// Read font
fs.readFile('./demo/Cabin-Bold.otf', function (err, buffer) {
  if (err) {

    throw err;
  } else {
    // Parse font
    var font = Typr.typr.parse(buffer);
    var glyphs = Typr.utility.stringToGlyphs(font, 'this is text');
    var path = Typr.utility.glyphsToPath(font, glyphs);

    // Create canvas
    var c = new Canvas(100, 100);
    var ctx = c.getContext('2d');

    // Write text to canvas
    Typr.utility.pathToContext(path, ctx);

    // Stream to PNG
    c.pngStream();

    // Save as png file
    var png = fs.createWriteStream('./test.png'),
      stream = c.pngStream();
    stream.on('data', function (chunk) {
      png.write(chunk);
    });
    stream.on('end', function () {
      png.log('saved png');
    });
  }
});

