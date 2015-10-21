const tmp = require("temp").track(),
      fs = require("fs"),
      path = require("path"),
      binding = require("./binding");

const includePath = path.join(__dirname, "..", "..", "vendor", "tree-sitter", "include");

function loadLanguage(code) {
  var srcPath = tmp.openSync().path;
  var languageFunctionName = code.match(/ts_language_(\w+)/)[0];
  fs.writeFileSync(srcPath, code);
  return binding.loadLanguage(srcPath, languageFunctionName, includePath);
}

module.exports = {
  compile: binding.compile,
  loadLanguage: loadLanguage,
  includePath: includePath,
  dsl: require("./dsl"),
};
