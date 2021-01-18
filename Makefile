.PHONY: clean

default: .tmp dist dist/apu.mjs dist/apu.min.mjs dist/apu.polyfilled.mjs dist/apu.polyfilled.min.mjs index.d.ts

clean:
	rm -rf .tmp dist

dist:
	mkdir dist

dist/apu.mjs: .tmp/apu.js
	cp .tmp/apu.js dist/apu.mjs

dist/apu.min.mjs: dist/apu.mjs
	npx terser -mc < dist/apu.mjs > dist/apu.min.mjs

dist/apu.polyfilled.mjs: dist/apu.mjs
	cat node_modules/@shamblesides/audioworklet-polyfill/dist/audioworklet-polyfill.js dist/apu.mjs > dist/apu.polyfilled.mjs

dist/apu.polyfilled.min.mjs: dist/apu.min.mjs
	cat node_modules/@shamblesides/audioworklet-polyfill/dist/audioworklet-polyfill.js dist/apu.min.mjs > dist/apu.polyfilled.min.mjs

index.d.ts: lib/index.ts
	npx tsc --emitDeclarationOnly --declaration --lib dom,es2015 lib/index.ts --outDir .

.tmp:
	mkdir .tmp

.tmp/gb.o: lib/gb.c
	clang --target=wasm32 -c -O3 -flto -o .tmp/gb.o lib/gb.c

.tmp/gb.unoptimized.wasm: .tmp/gb.o
	$$(which wasm-ld || which wasm-ld-10) --no-entry --export-dynamic --lto-O3 -o .tmp/gb.unoptimized.wasm .tmp/gb.o

.tmp/gb.wasm: .tmp/gb.unoptimized.wasm
	wasm-opt -O2 -o .tmp/gb.wasm .tmp/gb.unoptimized.wasm

.tmp/gb.worklet.min.js: lib/gb.worklet.js
	npx terser -mc < lib/gb.worklet.js > .tmp/gb.worklet.min.js

.tmp/apu.ts: lib/index.ts .tmp/gb.wasm .tmp/gb.worklet.min.js
	./tools/combine.js > .tmp/apu.ts

.tmp/apu.js: .tmp/apu.ts
	npx tsc -m es6 --lib dom,es2015 .tmp/apu.ts 
