#!/usr/bin/env node

require("coffee-script/register");

var treeSitter = require("./index"),
    templates = require("./lib/templates"),
    fs = require("fs"),
    path = require("path"),
    cp = require("ncp"),
    cwd = process.cwd();

var grammarHash = require(path.join(cwd, "grammar"));
var grammar = treeSitter.grammar(grammarHash);

fs.writeFileSync(path.join(cwd, "parser.c"), treeSitter.compile(grammar));
fs.writeFileSync(path.join(cwd, "parser.cc"), templates.code(grammar.name));
fs.writeFileSync(path.join(cwd, "binding.gyp"), templates.gyp(grammar.name));

cp(
  path.join(__dirname, "vendor", "tree-sitter", "include"),
  path.join(cwd, "include"),
  function(err) {
    if (err) {
      console.log("Error: ", err);
    }
  });
