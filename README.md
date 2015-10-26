# tree-sitter compiler

Incremental parsers for node

[![Build Status](https://travis-ci.org/maxbrunsfeld/node-tree-sitter-compiler.svg?branch=master)](https://travis-ci.org/maxbrunsfeld/node-tree-sitter-compiler)

### Installation

```
npm install tree-sitter-compiler
```

### Creating a language

Create a `grammar.coffee` in the root directory of your module. This file
should export a single function that takes an object containing the rule
builder functions, and returns an object describing the language's grammar:

```coffee-script
module.exports = grammar
  name: "arithmetic"

  ubiquitous: -> [@comment, /\s/]

  rules:
    program: -> repeat(choice(
      @assignment_statement,
      @expression_statement))

    assignment_statement: -> seq(
      @variable, "=", @expression, ";")

    expression_statement: -> seq(
      @expression, ";")

    expression: -> choice(
      @variable,
      @number,
      prec(1, seq(@expression, "+", @expression)),
      prec(1, seq(@expression, "-", @expression)),
      prec(2, seq(@expression, "*", @expression)),
      prec(2, seq(@expression, "/", @expression)),
      prec(3, seq(@expression, "^", @expression)))

    variable: -> /\a\w+/

    number: -> /\d+/

    comment: -> /#.*/
```

Run `tree-sitter compile`. This will generate a C function for parsing your
language, a C++ function that exposes the parser to javascript, and a
binding.gyp` file for compiling these sources into a native node module.

#### Grammar syntax

The `grammar` has the following keys:

* `name` - the name of the language.
* `rules` - a map of names to grammar rules. The first key in the map will be
  the start symbol. See the 'Rules' section for how to construct grammar rules.
* `ubiquitous` - an array of token rules which may appear anywhere. This
  construct is used to useful for things like comments in programming languages.

#### Rules

* `String` literals - match exact strings.
* `RegExp` literals - match strings according to ECMAScript regexp syntax.
  Assertions (e.g. `^`, `$`) are not yet supported.
* Symbols (written using `@` notation) - match another rule with the given name.
* `choice(rule...)` - matches any one of the given rules.
* `repeat(rule)` - matches any number of repetitions of the given rule.
* `seq(rule...)` - matches each of the given rules in sequence.
* `blank()` - matches the empty string.
* `optional(rule)` - matches the given rule or the empty string.
