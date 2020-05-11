/**
 * Emscripten bad!!! Let's just compile
 * our C code with clang & llvm instead ok?
 * 
 * Requirements
 * - Clang
 * - LLVM 8+ (has wasm-ld)
 * - Binaryen (has wasm-opt)
 * 
 * https://surma.dev/things/c-to-webassembly/
 */

const fs = require('fs');
const child_process = require('child_process');
const os = require('os');

function clangEmitLLVM(str) {
  const infile = this.resourcePath;
  const outfile = `${os.tmpdir()}/apu-clang-loader-${Math.random().toString().slice(2)}.ll`;

  const command = [
    `clang`,
    '--target=wasm32',
    '-c',
    '-O3',
    '-flto',
    `-o ${outfile}`,
    infile,
  ].join(' ');
  child_process.execSync(command);
  return fs.readFileSync(outfile)
}

function wasmLD(str) {
  const infile = `${os.tmpdir()}/apu-clang-loader-${Math.random().toString().slice(2)}.o`;
  const outfile = `${os.tmpdir()}/apu-clang-loader-${Math.random().toString().slice(2)}.wasm`;

  fs.writeFileSync(infile, str);
  const command = [
    `wasm-ld`,
    '--no-entry',
    '--export-dynamic',
    '--lto-O3',
    `-o ${outfile}`,
    infile,
  ].join(' ');
  child_process.execSync(command);
  return fs.readFileSync(outfile)
}

function wasmOpt(str) {
  const infile = `${os.tmpdir()}/apu-clang-loader-${Math.random().toString().slice(2)}.wasm`;
  const outfile = `${os.tmpdir()}/apu-clang-loader-${Math.random().toString().slice(2)}.wasm`;

  fs.writeFileSync(infile, str);
  const command = [
    `wasm-opt`,
    '-O2',
    `-o ${outfile}`,
    infile,
  ].join(' ');
  child_process.execSync(command);
  return fs.readFileSync(outfile)
}

module.exports = function(str) {
  str = clangEmitLLVM.call(this, str);
  str = wasmLD.call(this, str);
  str = wasmOpt.call(this, str);
  return str;
}