#!/usr/bin/env node

const assert = require('assert');
const ejs = require('ejs');
const fs = require('fs');

const worklet = fs.readFileSync('./.tmp/gb.worklet.min.js').toString('utf8');
assert(worklet.indexOf('`') === -1, "Minified worklet contains backtick");

const wasm = fs.readFileSync('./.tmp/gb.wasm').toString('base64');

const out = ejs.render(fs.readFileSync('./lib/index.ts', 'utf8'), {
    worklet,
    wasm,
})

console.log(out);
