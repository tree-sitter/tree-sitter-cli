var treeSitter = require("../../index"),
    fs = require("fs-extra"),
    path = require("path"),
    mkdirp = require("mkdirp"),
    templates = require("./templates"),
    cwd = process.cwd();

module.exports = function compile(options) {
  require("coffee-script/register");

  global.grammar = treeSitter.grammar;
  Object.keys(treeSitter.rules).forEach(function(key) {
    global[key] = treeSitter.rules[key];
  });

  var grammar = require(path.join(cwd, "grammar.coffee"));

  process.stdout.write("Generating parser... ");
  var startTime = process.hrtime();

  var code;
  try {
    code = treeSitter.compile(grammar)
  } catch (e) {
    if (e.isGrammarError) {
      console.warn("Error: " + e.message);
      return 1;
    } else {
      throw e;
    }
  }

  mkdirp.sync(path.join(cwd, "include", "tree_sitter"));
  fs.copySync(
    path.join(__dirname, "..", "..", "vendor", "tree-sitter", "include", "tree_sitter"),
    path.join(cwd, "include", "tree_sitter")
  )
  mkdirp.sync(path.join(cwd, "src"));
  fs.writeFileSync(path.join(cwd, "src", "parser.c"), code);
  fs.writeFileSync(path.join(cwd, "src", "binding.cc"), templates.bindingCC(grammar.name));
  fs.writeFileSync(path.join(cwd, "binding.gyp"), templates.bindingGyp(grammar.name));
  fs.writeFileSync(path.join(cwd, "index.js"), templates.indexJS(grammar.name));

  var endTime = process.hrtime(startTime);
  console.log("Done (%ds).", (endTime[0] + (endTime[1] / Math.pow(10, 9))).toFixed(2));
  return 0;
}
