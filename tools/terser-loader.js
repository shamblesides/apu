var Terser = require("terser");

module.exports = function(str) {
  return Terser.minify(str).code;
}
