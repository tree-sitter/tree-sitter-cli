treeSitter = require "tree-sitter"
assert = require "assert"
compiler = require ".."
SpyReader = require "./helpers/spy_reader"
{ blank, choice, repeat, seq } = compiler.rules

require("segfault-handler").registerHandler()

describe "building a grammar", ->
  document = null

  beforeEach ->
    document = new treeSitter.Document()

  describe "rules", ->
    describe "blank", ->
      it "matches the empty string", ->
        grammar = compiler.grammar
          name: "test_grammar"
          rules:
            the_rule: -> blank()

        document.setLanguage(compiler.compileAndLoad(grammar))

        document.setInputString("")
        assert.equal(document.toString(), "Document: (the_rule)")
        document.setInputString("not-blank")
        assert.equal(document.toString(), "Document: (ERROR 'n')")

    describe "string", ->
      it "matches one particular string", ->
        grammar = compiler.grammar
          name: "test_grammar"
          rules:
            the_rule: -> "the-string"

        document.setLanguage(compiler.compileAndLoad(grammar))

        document.setInputString("the-string")
        assert.equal(document.toString(), "Document: (the_rule)")
        document.setInputString("another-string")
        assert.equal(document.toString(), "Document: (ERROR 'a')")

    describe "regex", ->
      it "matches according to a regular expression", ->
        grammar = compiler.grammar
          name: "test_grammar"
          rules:
            the_rule: -> /[a-c]+/

        document.setLanguage(compiler.compileAndLoad(grammar))

        document.setInputString("abcba")
        assert.equal(document.toString(), "Document: (the_rule)")
        document.setInputString("def")
        assert.equal(document.toString(), "Document: (ERROR 'd')")

    describe "repeat", ->
      it "applies the given rule any number of times", ->
        grammar = compiler.grammar
          name: "test_grammar"
          rules:
            the_rule: -> repeat("o")

        document.setLanguage(compiler.compileAndLoad(grammar))

        document.setInputString("")
        assert.equal(document.toString(), "Document: (the_rule)")
        document.setInputString("o")
        assert.equal(document.toString(), "Document: (the_rule)")
        document.setInputString("ooo")
        assert.equal(document.toString(), "Document: (the_rule)")

    describe "sequence", ->
      it "applies a list of other rules in sequence", ->
        grammar = compiler.grammar
          name: "test_grammar"
          rules:
            the_rule: -> seq("1", "2", "3")

        document.setLanguage(compiler.compileAndLoad(grammar))

        document.setInputString("123")
        assert.equal(document.toString(), "Document: (the_rule)")
        document.setInputString("12")
        assert.equal(document.toString(), "Document: (ERROR <EOF>)")
        document.setInputString("1234")
        assert.equal(document.toString(), "Document: (ERROR '4')")

    describe "choice", ->
      it "applies any of a list of rules", ->
        grammar = compiler.grammar
          name: "test_grammar"
          rules:
            the_rule: -> choice("1", "2", "3")

        document.setLanguage(compiler.compileAndLoad(grammar))

        document.setInputString("1")
        assert.equal(document.toString(), "Document: (the_rule)")
        document.setInputString("4")
        assert.equal(document.toString(), "Document: (ERROR '4')")

    describe "symbol", ->
      it "applies another rule in the grammar by name", ->
        grammar = compiler.grammar
          name: "test_grammar"
          rules:
            the_rule: -> seq(@second_rule, "-", @third_rule)
            second_rule: -> "one"
            third_rule: -> "two"

        document.setLanguage(compiler.compileAndLoad(grammar))

        document.setInputString("one-two")
        assert.equal(document.toString(), "Document: (the_rule (second_rule) (third_rule))")
        
  describe "error handling", ->
    describe "when the grammar has no name", ->
      it "raises an error", ->
        assert.throws((->
          compiler.grammar
            rules:
              the_rule: -> blank()
        ), /grammar.*name.*string/)

        assert.throws((->
          compiler.grammar
            name: {}
            rules:
              the_rule: -> blank()
        ), /grammar.*name.*string/)

    describe "when the grammar has no rules", ->
      it "raises an error", ->
        assert.throws((->
          compiler.grammar
            name: "test_grammar"
        ), /grammar.*rules.*object/)
