treeSitter = require "tree-sitter"
assert = require "assert"
compiler = require ".."
SpyReader = require "./helpers/spy_reader"
{ blank } = compiler.rules

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

        document.setParser(compiler.compileAndLoad(grammar))

        document.setInputString("")
        assert.equal(document.toString(), "Document: (the_rule)")
        document.setInputString("not-blank")
        assert.equal(document.toString(), "Document: (ERROR 'n')")

    describe "strings", ->
      it "matches the exact string", ->
        grammar = compiler.grammar
          name: "test_grammar"
          rules:
            the_rule: -> "the-string"

        document.setParser(compiler.compileAndLoad(grammar))

        document.setInputString("the-string")
        assert.equal(document.toString(), "Document: (the_rule)")
        document.setInputString("another-string")
        assert.equal(document.toString(), "Document: (ERROR 'a')")

    describe "regexes", ->
      it "matches the given regex pattern", ->
        grammar = compiler.grammar
          name: "test_grammar"
          rules:
            the_rule: -> /[a-c]+/

        document.setParser(compiler.compileAndLoad(grammar))

        document.setInputString("abcba")
        assert.equal(document.toString(), "Document: (the_rule)")
        document.setInputString("def")
        assert.equal(document.toString(), "Document: (ERROR 'd')")

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
