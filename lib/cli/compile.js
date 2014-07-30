var treeSitter = require("../../index"),
    fs = require("fs"),
    path = require("path"),
    mkdirp = require("mkdirp"),
    cp = require("ncp"),
    templates = require("./templates"),
    cwd = process.cwd();

module.exports = function compile() {
  require("coffee-script/register");
  var grammar = require(path.join(cwd, "grammar.coffee"));

  mkdirp.sync(path.join(cwd, "src"));
  fs.writeFileSync(path.join(cwd, "src", "parser.c"), treeSitter.compile(grammar));
  fs.writeFileSync(path.join(cwd, "src", "binding.cc"), templates.bindingCC(grammar.name));
  fs.writeFileSync(path.join(cwd, "binding.gyp"), templates.bindingGyp(grammar.name));
  fs.writeFileSync(path.join(cwd, "index.js"), templates.indexJS(grammar.name));
  fs.writeFileSync(path.join(cwd, "grammar.json"), JSON.stringify(grammar, null, 2));

  cp(
    path.join(__dirname, "..", "..", "vendor", "tree-sitter", "include"),
    path.join(cwd, "include"),
    function(err) {
      if (err) {
        console.log("Error: ", err);
      }
    });
}
