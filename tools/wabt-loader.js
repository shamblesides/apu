/**
 * The wast-loader package already exists,
 * but, at time of writing (May 2020)
 * it seems busted! It fails to compile
 * some pretty basic programs that I
 * hand-wrote
 * 
 * So you gotta install wabt. Sorry gamers
 */

const fs = require('fs');
const process = require('child_process');
const os = require('os');

module.exports = (str) => {
  const infile = `${os.tmpdir()}/${Math.random()}.wat`;
  const outfile = `${os.tmpdir()}/${Math.random()}.wasm`;

  fs.writeFileSync(infile, str);
  process.execSync(`wat2wasm -o ${outfile} ${infile}`)
  return fs.readFileSync(outfile, 'utf8')
}