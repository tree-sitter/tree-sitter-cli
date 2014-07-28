#!/usr/bin/env node

require("coffee-script/register");

var treeSitter = require("./index"),
    templates = require("./lib/templates"),
    fs = require("fs"),
    path = require("path"),
    mkdirp = require("mkdirp"),
    cp = require("ncp"),
    cwd = process.cwd(),
    command = process.argv[2];

switch (command) {
  case "compile":
    compile();
    break;
  case undefined:
    console.log("Usage: %s compile", path.basename(process.argv[1]));
    break;
  default:
    console.log("Unrecognized command '%s'", command);
    break;
}

function compile() {
  var grammarHash = require(path.join(cwd, "grammar")),
      grammar = treeSitter.grammar(grammarHash);

  mkdirp.sync(path.join(cwd, "src"));
  fs.writeFileSync(path.join(cwd, "src", "parser.c"), treeSitter.compile(grammar));
  fs.writeFileSync(path.join(cwd, "src", "binding.cc"), templates.bindingCC(grammar.name));
  fs.writeFileSync(path.join(cwd, "binding.gyp"), templates.bindingGyp(grammar.name));
  fs.writeFileSync(path.join(cwd, "index.js"), templates.indexJS(grammar.name));

  cp(
    path.join(__dirname, "vendor", "tree-sitter", "include"),
    path.join(cwd, "include"),
    function(err) {
      if (err) {
        console.log("Error: ", err);
      }
    });
}
