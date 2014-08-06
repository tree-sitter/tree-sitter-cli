# tree-sitter compiler

Incremental parsers for node

[![Build Status](https://travis-ci.org/maxbrunsfeld/node-tree-sitter-compiler.svg?branch=master)](https://travis-ci.org/maxbrunsfeld/node-tree-sitter-compiler)

### Installation

```
npm install tree-sitter-compiler
```

### Creating a language

Create a `grammar.coffee` in the root directory of your module. This file should export a `tree-sitter` grammar object:

```coffee-script
compiler = require "tree-sitter-compiler"
{ choice, repeat, seq } = compiler.rules

module.exports = compiler.grammar
  name: "my-grammar"
  
  rules:
    sentence: -> seq(
      @capitalizedWord,
      repeat(choice(
        @word,
        @number,
        ",")),
      ".")
      
    capitalizedWord: -> /[A-Z]\a*/
    word: -> /\a+/
    number: -> /\d+/
```

Run `tree-sitter compile`. This will generate a C function for parsing your langauge, a C++ function that exposes the parser to javascript, and a `binding.gyp` file for compiling these sources into a native node module.

#### Grammar syntax

The `grammar` function takes an object with the following keys:

* `name` - the name of the grammar
* `rules` - a hash of named rules (see the 'Rules' section)
* `ubiquitous` - an array containing names of rules that are allowed to occur at any point in the input string. This is useful for parsing constructs like comments in programming languages.
* `separators` - an array of 1-character strings which should be ignored in the input string.

#### Rules

* `String` literal - matches exact strings.
* `Regex` literal - matches strings according to ECMAScript regexp syntax. Assertions (e.g. `^`, `$`) are not supported.
* `@` property references - matches another rule with the given name.
* `choice(rule...)` - matches any one of the given rules.
* `repeat(rule)` - matches any number of repetitions of the given rule.
* `seq(rule...)` - matches each of the given rules in sequence.
* `blank()` - matches the empty string.
* `optional(rule)` - matches the given rule or the empty string.
