# tree-sitter-cli

Incremental parsers for node

[![Build Status](https://travis-ci.org/tree-sitter/tree-sitter-cli.svg?branch=master)](https://travis-ci.org/tree-sitter/tree-sitter-cli)
[![Build status](https://ci.appveyor.com/api/projects/status/t9775gnhcnsb5na1/branch/master?svg=true)](https://ci.appveyor.com/project/maxbrunsfeld/tree-sitter-cli/branch/master)

### Installation

```
npm install tree-sitter-cli
```

### Creating a language

Create a `grammar.js` in the root directory of your module. This file
should create and export a grammar object using tree-sitter's helper functions:

```js
module.exports = grammar({
  name: "arithmetic",

  extras: $ => [$.comment, /\s/],

  rules: {
    program: $ => repeat(choice(
      $.assignment_statement,
      $.expression_statement
    )),

    assignment_statement: $ => seq(
      $.variable, "=", $.expression, ";"
    ),

    expression_statement: $ => seq(
      $.expression, ";"
    ),

    expression: $ => choice(
      $.variable,
      $.number,
      prec.left(1, seq($.expression, "+", $.expression)),
      prec.left(1, seq($.expression, "-", $.expression)),
      prec.left(2, seq($.expression, "*", $.expression)),
      prec.left(2, seq($.expression, "/", $.expression)),
      prec.left(3, seq($.expression, "^", $.expression))
    ),

    variable: $ => /\a\w*/,

    number: $ => /\d+/,

    comment: $ => /#.*/
  }
});
```

Run `tree-sitter generate`. This will generate a C function for parsing your
language, a C++ function that exposes the parser to javascript, and a
`binding.gyp` file for compiling these sources into a native node module.

#### Grammar syntax

The `grammar` function takes an object with the following keys:

* `name` - the name of the language.
* `rules` - an object whose keys are rule names and whose values are Grammar Rules. The first key in the map will be the start symbol. See the 'Rules' section for how to construct grammar rules.
* `extras` - an array of Grammar Rules which may appear anywhere in a document. This construct is used to useful for things like whitespace and comments in programming languages.
* `conflicts` - an array of arrays of Grammar Rules which are known to conflict with each other in [an LR(1) parser](https://en.wikipedia.org/wiki/Canonical_LR_parser). You'll need to use this if writing a grammar that is not LR(1).

#### Rules

* `$.property` references - match another rule with the given name.
* `String` literals - match exact strings.
* `RegExp` literals - match strings according to ECMAScript regexp syntax.
  Assertions (e.g. `^`, `$`) are not yet supported.
* `choice(rule...)` - matches any one of the given rules.
* `repeat(rule)` - matches any number of repetitions of the given rule.
* `seq(rule...)` - matches each of the given rules in sequence.
* `blank()` - matches the empty string.
* `optional(rule)` - matches the given rule or the empty string.
