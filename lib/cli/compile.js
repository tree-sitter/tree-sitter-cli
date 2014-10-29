var treeSitter = require("../../index"),
    fs = require("fs"),
    path = require("path"),
    mkdirp = require("mkdirp"),
    cp = require("ncp"),
    templates = require("./templates"),
    cwd = process.cwd();

module.exports = function compile(options) {

  require("coffee-script/register");
  var grammar = require(path.join(cwd, "grammar.coffee"));

  process.stdout.write("Generating parser... ");
  var startTime = process.hrtime();

  result = treeSitter.compile(grammar)

  mkdirp.sync(path.join(cwd, "src"));
  fs.writeFileSync(path.join(cwd, "src", "parser.c"), result.code);
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

  var endTime = process.hrtime(startTime);
  console.log("Done (%ds).", (endTime[0] + (endTime[1] / Math.pow(10, 9))).toFixed(2));

  if (options.verbose) {
    console.log("\nConflicts:");
    result.conflicts.forEach(function(conflict) {
      console.log(conflict);
    });
  }
}
