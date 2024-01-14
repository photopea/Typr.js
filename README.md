# Typr.js  

[LIVE DEMO](https://photopea.github.io/Typr.js) Typr.js is a Javascript parser and utility for working with fonts (TTF, OTF, TTC). It is an alternative to [opentype.js](https://github.com/nodebox/opentype.js). It is the main text engine for [Photopea image editor](https://www.photopea.com).

* light and small (70 kB unminified uncompressed, 4x smaller than opentype.js)
* ultra fast (2x to 5x faster parsing than opentype.js)
* successfully parsed more than 3000 fonts (opentype.js had problems with many of them)
* simple structure and easy to extend
* supports colored (SVG) fonts

![Typr.js preview](glyphs.png "Typr.js preview")

Typr.js consists of static functions only, it can be easily rewritten into C or any other procedural language. There are no constructors, no methods, no complex structure. It consists of two independent parts (separate files):

* `Typr` - main parser, parses the raw data, generates the font object.
* `Typr.U` - Typr utilities. Basic operations with fonts. Use it as a guide to write your own utilities.


## Typr

#### `Typr.parse(buffer)`
* `buffer`: ArrayBuffer, binary data of the TTF, OTF or TTC font
* returns an array of font objects (one item for TTF/OTF, multiple for TTC)

The font object has a structure, wich corresponds to the structure of the TTF/OTF file. I.e. it is a set of tables, each table has its own structure.

```javascript
var fonts = Typr.parse(buffer);
console.log(fonts[0]);
```
## Typr.U

#### `Typr.U.codeToGlyph(font, code)`

* `font`: font object
* `code`: integer Unicode code of the character
* returns an integer index of the glyph, corresponding to the unicode character

#### `Typr.U.shape(font, str, ltr)`

* `font`: font object
* `str`: standard JS string
* `ltr`: true when the text is written from left to right
* returns a shape: a geometric description of a string. The output is an array of elements. Each element has these parameters `g`: Glyph index, `cl`: Cluster index , `ax, ay`: Advancement of a glyph, `dx, dy`: an offset from a pen, at which the glyph should be drawn.

The shape can have a different length, than the input string (because of ligatures, etc). The cluster index says, which part of string the glyph represents.

#### `Typr.U.glyphToPath(font, gid)`

* `font`: font object
* `gid`: index of the glyph, which you want to access
* returns the vector path of the outline of the glyph

#### `Typr.U.shapeToPath(font, shape)`

* `font`: font object
* `shape`: e.g. the output of Typr.U.shape(...) 
* returns the vector path of the outline of the glyph

Typr.js uses the following structure to represent the path:
```javascript
{ cmds: [CMD,CMD,CMD, ...], crds:[X,Y,X,Y, ...] }
```
`cmds` is an array of commands (Strings), `crds` is an array of coordinates (Numbers). Each command needs a specific number of coordinates. The path can be processed by passing both arrays from the left, index into `crds` depends on the types of previous commands.

* "M": (X,Y) - move the pointer to X,Y.
* "L": (X,Y) - line from the previous position to X,Y.
* "Q": (X1,Y1,X2,Y2) - quadratic bézier curve from the previous position to X2,Y2, using X1,Y1 as a control point.
* "C": (X1,Y1,X2,Y2,X3,Y3) - cubic bézier curve from the previous position to X3,Y3, using X1,Y1 and X2,Y2 as control points.
* "Z": () - draw a line to the first point to finish the outline.
* "#rrggbb" : () - set the current collor to RGB(rr,gg,bb) (SVG fonts use this)
* "X": () - fill the current path (SVG fonts use this)

A "raindrop" shape: `{ cmds:["M","L","Q","Z"], crds:[0,0,20,80,0,120,-20,80] }` (2 + 2 + 4 + 0 coordinates). 

The format is similar to SVG, but commands and coordinates are separated. It is comfortable to work with coordinates as a set of 2D points, apply affine transformations etc.

#### `Typr.U.pathToContext(path, ctx)`

* `path`: path to draw
* `ctx`: context2d to draw the path into

It executes each command of the path with a corresponding command of context2D: moveTo(), lineTo(), ... and fill(). It does nothing else (you must call translate(), scale(), fillStyle ... manually).

#### `Typr.U.pathToSVG(path)`

Converts a path to an "SVG path string", which can be used in `<path d="..." />`.

## Extending Typr

Let's implement a little function for drawing a string:
```javascript
Typr.U.stringToContext = function(font, str, ctx, size, color, x, y)
{
  var shape = Typr.U.shape(font, str);
  var path  = Typr.U.shapeToPath(font, shape);
  var scale = size / font.head.unitsPerEm;
  
  ctx.translate(x,y);  ctx.scale(scale,-scale);
  
  ctx.fillStyle = color;
  Typr.U.pathToContext(path, ctx);
  
  ctx.scale(1/scale,-1/scale);  ctx.translate(-x,-y);
}
```
## Shaping with HarfBuzz

Typr.U.shape() provides only basic text shaping. For advanced shaping, Typr.js can be integrated with a [HarfBuzz shaping library](http://www.harfbuzz.org/). HarfBuzz supports advanced shaping of Arabic, Urdu, Farsi, Khmer, You need a WASM version of the library (can be found [here](https://www.photopea.com/code/ext/hb.wasm)). The integration is done through a following function.

#### `Typr.U.initHB(url, clb)`

* `url`: the URL of the HarfBuzz WASM file
* `clb`: a callback function, that is called when the HarfBuzz is loaded and ready to use

Once the HarfBuzz is loaded, you can use `Typr.U.shapeHB()` instead of `Typr.U.shape()`. It accepts identical parameters and returns a shape in the identical format, which can be used with e.g. `Typr.U.shapeToPath()`.
