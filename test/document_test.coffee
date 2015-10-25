{assert} = require "chai"
compiler = require ".."
{compile, loadLanguage} = compiler
{grammar, repeat, choice} = compiler.dsl
{Document} = require "tree-sitter"

describe "Document", ->
  [document, language] = []

  before ->
    language = loadLanguage(compile(grammar
      name: "test"
      rules:
        sentence: -> repeat(choice(@word1, @word2, @word3, @word4))
        word1: -> "first-word"
        word2: -> "second-word"
        word3: -> "αβ"
        word4: -> "αβδ"
    ))

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
    it "reads from the given input when .parse() is called", ->
      document.setLanguage(language)

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
      }).parse()

      assert.equal("(sentence (word1) (word2))", document.rootNode.toString())

    it "allows the input to be retrieved later", ->
      assert.equal(null, document.getInput())

      input = {
        read: ->,
        seek: ->
      }

      document.setInput(input)
      assert.equal(input, document.getInput())

      document.setInput(null)
      assert.equal(null, document.getInput())

    describe "when the input.read() returns something other than a string", ->
      it "stops reading", ->
        document.setLanguage(language)
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

        document.setInput(input).parse()

        assert.equal("(sentence (word1))", document.rootNode.toString())
        assert.equal(4, input._readIndex)

    describe "when given something that isn't an object", ->
      it "throws an exception", ->
        assert.throws((->
          document.setInput("ok")
        ), /Input.*object/)

        assert.throws((->
          document.setInput(5)
        ), /Input.*object/)

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

  describe "::edit({ position, charsAdded, charsRemoved })", ->
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
      document.setInput(input).parse()

      assert.equal(
        "(sentence (word1) (word2) (word1))",
        document.rootNode.toString())

    describe "when text is inserted", ->
      it "updates the parse tree", ->
        input.text = "first-word first-word second-word first-word"

        document.edit(
          position: "first-word ".length
          charsInserted: "first-word ".length
        ).parse()

        assert.equal(
          document.rootNode.toString(),
          "(sentence (word1) (word1) (word2) (word1))")

    describe "when text is removed", ->
      it "updates the parse tree", ->
        input.text = "first-word first-word"
        document.edit(
          position: "first-word ".length
          charsRemoved: "second-word ".length
        ).parse()

        assert.equal(
          document.rootNode.toString(),
          "(sentence (word1) (word1))")

    describe "when the text contains non-ascii characters", ->
      beforeEach ->
        input.text = "αβ αβ αβ"

        document.invalidate().parse()
        assert.equal(
          document.rootNode.toString(),
          "(sentence (word3) (word3) (word3))")

      it "updates the parse tree correctly", ->
        input.text = "αβδ αβ αβ"
        document.edit(
          position: 2
          charsInserted: 1
        ).parse()

        assert.equal(
          document.rootNode.toString(),
          "(sentence (word4) (word3) (word3))")

    it "invalidates nodes from previous parses", ->
      input.text = input.text.slice(1)

      oldRootNode = document.rootNode
      assert.equal(oldRootNode.isValid(), true)

      document.edit(position: 0, charsRemoved: 1).parse()
      assert.equal(oldRootNode.isValid(), false)
      assert.equal(oldRootNode.name, null)
      assert.equal(oldRootNode.position, null)
      assert.equal(oldRootNode.size, null)

  describe "::setDebugger(callback)", ->
    debugMessages = null

    beforeEach ->
      debugMessages = []
      document.setLanguage(language)
      document.setDebugger (msg, params) ->
        debugMessages.push(msg)

    it "calls the given callback for each parse event", ->
      document.setInputString("first-word second-word").parse()
      assert.includeMembers(debugMessages, ['reduce', 'accept', 'shift'])

    it "allows the callback to be retrieved later", ->
      callback = ->

      document.setDebugger(callback)
      assert.equal(callback, document.getDebugger())

      document.setDebugger(false)
      assert.equal(null, document.getDebugger())

    describe "when given a falsy value", ->
      beforeEach ->
        document.setDebugger(false)

      it "disables debugging", ->
        document.setInputString("first-word second-word")
        assert.equal(0, debugMessages.length)

    describe "when given a truthy value that isn't a function", ->
      it "raises an exception", ->
        assert.throws((->
          document.setDebugger("5")
        ), /Debug callback must .* function .* falsy/)

    describe "when the given callback throws an exception", ->
      [errorMessages, originalConsoleError, thrownError] = []

      beforeEach ->
        errorMessages = []
        thrownError = new Error("dang.")

        originalConsoleError = console.error
        console.error = (params...) ->
          errorMessages.push(params)

        document.setDebugger (msg, params) ->
          throw thrownError

      afterEach ->
        console.error = originalConsoleError

      it "logs the error to the console", ->
        document.setInputString("first-word").parse()

        assert.deepEqual(errorMessages[0], [
          "Error in debug callback:",
          thrownError
        ])
