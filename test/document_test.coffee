assert = require "assert"
compiler = require ".."
{ repeat, choice } = compiler.rules
{ Document } = require "tree-sitter"

precondition = (f) ->
  it "has the right precondition", f

describe "Document", ->
  document = null

  language = compiler.compileAndLoad(compiler.grammar
    name: "test"
    rules:
      sentence: -> repeat(choice(@word1, @word2))
      word1: -> "first-word"
      word2: -> "second-word"
  )

  beforeEach ->
    document = new Document()

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
        assert.equal(null, document.children)

  describe "::setInput(input)", ->
    describe "when the language has been set", ->
      beforeEach ->
        document.setLanguage(language)

      it "parses the input", ->
        document.setInput({
          read: ->
            @_readIndex++
            [
              "first", "-", "word",
              " ",
              "second", "-", "word",
              ""
            ][@_readIndex - 1]

          seek: (n) ->
            0

          _readIndex: 0,
        })

        assert.equal("(DOCUMENT (sentence (word1) (word2)))", document.toString())

      describe "when the input.read() returns something other than a string", ->
        it "stops reading", ->
          input = {
            read: ->
              @_readIndex++
              [
                "first", "-", "word",
                {},
                "second-word",
                " "
              ][@_readIndex - 1]

            seek: (n) ->
              0

            _readIndex: 0,
          }

          document.setInput(input)

          assert.equal("(DOCUMENT (sentence (word1)))", document.toString())
          assert.equal(4, input._readIndex)

    describe "when the supplied object does not implement ::seek(n)", ->
      it "throws an exception", ->
        assert.throws((->
          document.setInput({
            read: -> ""
          })
        ), /Input.*implement.*seek/)

    describe "when the supplied object does not implement ::read()", ->
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
        assert.equal(null, document.children)

  describe "::edit({ position, bytesAdded, bytesRemoved })", ->
    input = null

    beforeEach ->
      input = {
        position: 0
        chunkSize: 3
        text: "first-word second-word first-word"

        seek: (n) ->
          @position = n

        read: ->
          result = @text.slice(@position, @position + @chunkSize)
          @position += @chunkSize
          result
      }

      document.setLanguage(language)
      document.setInput(input)

    precondition ->
      assert.equal(
        "(DOCUMENT (sentence (word1) (word2) (word1)))",
        document.toString())

    describe "when text is inserted", ->
      it "updates the parse tree", ->
        input.text = "first-word first-word second-word first-word"
        document.edit(
          position: "first-word ".length
          bytesInserted: "first-word ".length
        )

        assert.equal(
          document.toString(),
          "(DOCUMENT (sentence (word1) (word1) (word2) (word1)))")

    describe "when text is removed", ->
      it "updates the parse tree", ->
        input.text = "first-word first-word"
        document.edit(
          position: "first-word ".length
          bytesRemoved: "second-word ".length
        )

        assert.equal(
          document.toString(),
          "(DOCUMENT (sentence (word1) (word1)))")

  it "has all the same methods as AST nodes", ->
    document.setLanguage(language)
    document.setInputString("first-word")

    node = document.children[0]
    for methodName of node.constructor.prototype
      document[methodName]()
