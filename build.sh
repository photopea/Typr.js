#!/usr/bin/env bash

cd src/tabs

cat cff.js  cmap.js  glyf.js  GPOS.js  GSUB.js  head.js  hhea.js  \
hmtx.js  kern.js  loca.js  maxp.js  name.js  os-2.js  post.js  >  tabs.js

cd ..

cat  main.js  bin.js  lctf.js  tabs/tabs.js  > ../dist/Typr.js

cp ./Typr.U.js ../dist/Typr.U.js