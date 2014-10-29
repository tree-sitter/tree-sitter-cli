var tmp = require("temp").track(),
    fs = require("fs"),
    path = require("path"),
    binding = require("./binding");

var headerDir = path.join(__dirname, "..", "..", "vendor", "tree-sitter", "include");

module.exports = function compileAndLoad(grammar) {
  var code = binding.compile(grammar).code,
      srcPath = tmp.openSync().path;

  fs.writeFileSync(srcPath, code);

  return binding.loadLanguage(srcPath, grammar.name, headerDir);
}
