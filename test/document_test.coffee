treeSitter = require "tree-sitter"
assert = require "assert"
compiler = require ".."
{ repeat } = compiler.rules

describe "Document", ->
  document = null

  language = compiler.compileAndLoad(compiler.grammar
    name: "test"
    rules:
      sentence: -> repeat(@word)
      word: -> "the-word"
  )

  beforeEach ->
    document = new treeSitter.Document()

  describe "::setLanguage(language)", ->
    describe "when the supplied object is not a tree-sitter language", ->
      it "throws an exception", ->
        assert.throws((->
          document.setLanguage({})
        ), /Invalid language/)

        assert.throws((->
          document.setLanguage(undefined)
        ), /Invalid language/)

    describe "when the input has not yet been set", ->
      it "doesn't try to parse", ->
        document.setLanguage(language)
        assert.equal(null, document.rootNode())

  describe "::setInput(input)", ->
    describe "when the language has been set", ->
      beforeEach ->
        document.setLanguage(language)

      it "parses the input", ->
        document.setInput({
          read: ->
            @_readIndex++
            [
              "the", "-", "word",
              " ",
              "the", "-", "word",
              ""
            ][@_readIndex - 1]

          seek: (n) ->
            0

          _readIndex: 0,
        })

        assert.equal("(sentence (word) (word))", document.rootNode().toString())

      describe "when the input.read() returns something other than a string", ->
        it "stops reading", ->
          input = {
            read: ->
              @_readIndex++
              [
                "the", "-", "word",
                {},
                "the", "-", "word",
                " "
              ][@_readIndex - 1]

            seek: (n) ->
              0

            _readIndex: 0,
          }

          document.setInput(input)

          assert.equal("(sentence (word))", document.rootNode().toString())
          assert.equal(4, input._readIndex)

    describe "when the supplied object does not implement #seek(n)", ->
      it "throws an exception", ->
        assert.throws((->
          document.setInput({
            read: -> ""
          })
        ), /Input.*implement.*seek/)

    describe "when the supplied object does not implement #read()", ->
      it "throws an exception", ->
        assert.throws((->
          document.setInput({
            seek: (n) -> 0
          })
        ), /Input.*implement.*read/)

    describe "when the language has not yet been set", ->
      it "doesn't try to parse", ->
        document.setInput({
          read: -> ""
          seek: (n) -> 0
        })
        assert.equal(null, document.rootNode())

