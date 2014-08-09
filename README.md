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

* `name` - the name of the language.
* `rules` - a map of names to grammar rules. The first key in the map will be the start symbol. See the 'Rules' section for how to construct grammar rules.
* `ubiquitous` - an array containing names of rules that may occur anywhere in a document. This construct is useful for things like comments in programming languages.
* `separators` - an array of 1-character strings indicating which characters in the document should be skipped when they occur between tokens.

#### Rules

* `String` literals - match exact strings.
* `Regex` literals - match strings according to ECMAScript regexp syntax. Assertions (e.g. `^`, `$`) are not supported.
* `@` property references - match another rule with the given name.
* `choice(rule...)` - matches any one of the given rules.
* `repeat(rule)` - matches any number of repetitions of the given rule.
* `seq(rule...)` - matches each of the given rules in sequence.
* `blank()` - matches the empty string.
* `optional(rule)` - matches the given rule or the empty string.
