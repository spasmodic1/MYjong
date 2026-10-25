require('esbuild').buildSync({ entryPoints:['src/recognition-entry.js'],bundle:true,format:'esm',platform:'browser',target:'chrome120',minify:true,
  outfile:'assets/recognition.js',alias:{'@tensorflow/tfjs-backend-wasm/dist/index.js':'./tools/wasm-stub.js'},legalComments:'eof' });
