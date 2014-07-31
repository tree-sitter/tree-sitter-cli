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
    document.setLanguage(parser)

  describe.only "error handling", ->
    describe "setLanguage", ->
      describe "when the supplied object is not a tree-sitter language", ->
        it "throws an exception", ->
          assert.throws((->
            document.setLanguage({})
          ), /Invalid parser/)

          assert.throws((->
            document.setLanguage(undefined)
          ), /Invalid parser/)

    describe "setInput", ->
      describe "when the supplied object does not implement .seek(n)", ->
        it "throws an exception", ->
          assert.throws((->
            document.setInput({
              read: -> ""
            })
          ), /Input.*implement.*seek/)

      describe "when the supplied object does not implement .read()", ->
        it "throws an exception", ->
          assert.throws((->
            document.setInput({
              seek: (n) -> 0
            })
          ), /Input.*implement.*read/)

      it "succeeds otherwise", ->
        document.setInput({
          read: -> ""
          seek: (n) -> 0
        })
