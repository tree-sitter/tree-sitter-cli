#!/usr/bin/env node

require("coffee-script/register");
var treeSitter = require("./index"),
    parseArgs = require("minimist");

var args = parseArgs(process.argv.slice(2));
var filename = args._[0];
var grammarFn = require(filename);

var grammarHash = grammarFn(treeSitter.rules);
var grammar = treeSitter.grammar(grammarHash);
var code = treeSitter.compile(grammar)

console.log(code);
