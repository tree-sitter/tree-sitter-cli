treeSitter = require "tree-sitter"
assert = require "assert"
compiler = require ".."

describe "Document", ->
  document = null
  parser = null

  before ->
    grammar = compiler.grammar
      name: "test"
      rules:
        stuff: -> "stuff"

    parser = compiler.compileAndLoad(grammar)

  beforeEach ->
    document = new treeSitter.Document()
    document.setParser(parser)

  describe "setParser", ->
    describe "when the supplied object is not a parser", ->
      it "throws an exception", ->
        assert.throws((->
          document.setParser({})
        ), /Invalid parser/)

  describe "setInput", ->
    describe "when the supplied object does not implement .seek(n)", ->
      it "throws an exception", ->
        assert.throws((->
          document.setInput({
            seek: (n) -> 0
          })
        ), /Input.*implement.*read/)

        assert.throws((->
          document.setInput({
            read: -> ""
          })
        ), /Input.*implement.*seek/)

        document.setInput({
          read: -> ""
          seek: (n) -> 0
        })
