var api = require("../api"),
    fs = require("fs-extra"),
    path = require("path"),
    mkdirp = require("mkdirp"),
    templates = require("./templates"),
    cwd = process.cwd();

module.exports = function compile(options) {
  for (var key in api.dsl) {
    global[key] = api.dsl[key];
  }

  require("coffee-script/register");
  var grammar = require(path.join(cwd, "grammar"));

  var code;
  try {
    code = api.compile(grammar)
  } catch (e) {
    if (e.isGrammarError) {
      console.warn("Error: " + e.message);
      return 1;
    } else {
      throw e;
    }
  }

  mkdirp.sync(path.join(cwd, "src"));
  mkdirp.sync(path.join(cwd, "src", "tree_sitter"));

  const headerPath = path.join(__dirname, "..", "..", "vendor", "tree-sitter", "include", "tree_sitter")
  fs.copySync(path.join(headerPath, "runtime.h"), path.join(cwd, "src", "tree_sitter", "runtime.h"))
  fs.copySync(path.join(headerPath, "parser.h"), path.join(cwd, "src", "tree_sitter", "parser.h"))

  fs.writeFileSync(path.join(cwd, "src", "grammar.json"), JSON.stringify(grammar, null, 2));
  fs.writeFileSync(path.join(cwd, "src", "parser.c"), code);
  fs.writeFileSync(path.join(cwd, "src", "binding.cc"), templates.bindingCC(grammar.name));
  fs.writeFileSync(path.join(cwd, "binding.gyp"), templates.bindingGyp(grammar.name));
  fs.writeFileSync(path.join(cwd, "index.js"), templates.indexJS(grammar.name));

  return 0;
}
