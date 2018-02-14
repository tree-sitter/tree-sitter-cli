const {assert} = require("chai");
const {dsl, generate, loadLanguage} = require("..");
const {choice, prec, repeat, seq, grammar} = dsl
const {Document} = require("tree-sitter")

describe("Document", () => {
  let document, language;

  before(() => {
    language = loadLanguage(generate(grammar({
      name: "test",
      rules: {
        sentence: $ => repeat(choice($.word1, $.word2, $.word3, $.word4)),
        word1: $ => "first-word",
        word2: $ => "second-word",
        word3: $ => "αβ",
        word4: $ => "αβδ",
      }
    })));
  });

  beforeEach(() => {
    document = new Document();
  });

  describe(".setLanguage", () => {
    describe("when the supplied object is not a tree-sitter language", () => {
      it("throws an exception", () => {
        assert.throws((() =>
          document.setLanguage({})
        ), /Invalid language/)

        assert.throws((() =>
          document.setLanguage(undefined)
        ), /Invalid language/)
      });
    });

    describe("when the input has not yet been set", () => {
      it("doesn't try to parse", () => {
        document.setLanguage(language)
        assert.equal(null, document.children)
      });
    });
  });

  describe(".setInput", () => {
    it("reads from the given input when .parse() is called", () => {
      document.setLanguage(language)

      document.setInput({
        read: function () {
          return [
            "first", "-", "word",
            " ",
            "second", "-", "word",
            ""
          ][this._readIndex++];
        },

        seek: function () {},

        _readIndex: 0,
      }).parse()

      assert.equal("(sentence (word1) (word2))", document.rootNode.toString())
    });

    it("allows the input to be retrieved later", () => {
      assert.equal(null, document.getInput())

      let input = {
        read: () => null,
        seek: () => null
      };

      document.setInput(input)
      assert.equal(input, document.getInput())

      document.setInput(null)
      assert.equal(null, document.getInput())
    });

    describe("when the input.read() returns something other than a string", () => {
      it("stops reading", () => {
        document.setLanguage(language)
        document.setInput({
          read: function () {
            return [
              "first", "-", "word",
              {},
              "second-word",
              " "
            ][this._readIndex++];
          },

          seek: () => 0,

          _readIndex: 0,
        }).parse()

        assert.equal("(sentence (word1))", document.rootNode.toString())
        assert.equal(4, document.getInput()._readIndex)
      });
    });

    describe("when given something that isn't an object", () => {
      it("throws an exception", () => {
        assert.throws((() =>
          document.setInput("ok")
        ), /Input.*object/)

        assert.throws((() =>
          document.setInput(5)
        ), /Input.*object/)
      });
    });

    describe("when the supplied object does not implement ::seek(n)", () => {
      it("throws an exception", () => {
        assert.throws((() =>
          document.setInput({
            read: () => ""
          })
        ), /Input.*implement.*seek/)
      });
    });

    describe("when the supplied object does not implement ::read()", () => {
      it("throws an exception", () => {
        assert.throws((() =>
          document.setInput({
            seek: (n) => 0
          })
        ), /Input.*implement.*read/)
      });
    });

    it("handles long input strings", () => {
      const repeatCount = 10000
      const wordCount = 4 * repeatCount
      const inputString = "first-word second-word αβ αβδ".repeat(repeatCount)

      document
        .setLanguage(language)
        .setInputString(inputString)
        .parse()

      assert.equal(document.rootNode.type, 'sentence')
      assert.equal(document.rootNode.children.length, wordCount)
    });
  });

  describe(".edit", () => {
    let input;

    beforeEach(() => {
      input = {
        offset: 0,
        chunkSize: 3,
        text: "first-word second-word first-word",

        seek (offset, position) {
          assert.deepEqual(position, {row: 0, column: offset});
          this.offset = offset;
        },

        read: function () {
          let result = this.text.slice(this.offset, this.offset + this.chunkSize)
          this.offset += this.chunkSize
          return result
        }
      };

      document.setLanguage(language)
      document.setInput(input).parse()

      assert.equal(
        "(sentence (word1) (word2) (word1))",
        document.rootNode.toString()
      );
    });

    describe("when text is inserted", () => {
      it("updates the parse tree", () => {
        input.text = "first-word first-word second-word first-word";

        document.edit({
          startIndex: 'first-word '.length,
          lengthAdded: 'first-word '.length,
          lengthRemoved: 0,
          startPosition: {row: 0, column: 'first-word '.length},
          extentAdded: {row: 0, column: 'first-word '.length},
          extentRemoved: {row: 0, column: 0}
        }).parse();

        assert.equal(
          document.rootNode.toString(),
          "(sentence (word1) (word1) (word2) (word1))");
      });
    });

    describe("when text is removed", () => {
      it("updates the parse tree", () => {
        input.text = "first-word first-word"
        document.edit({
          startIndex: 'first-word '.length,
          lengthAdded: 0,
          lengthRemoved: 'second-word '.length,
          startPosition: {row: 0, column: 'first-word '.length},
          extentAdded: {row: 0, column: 0},
          extentRemoved: {row: 0, column: 'second-word '.length}
        }).parse();

        assert.equal(
          document.rootNode.toString(),
          "(sentence (word1) (word1))")
      });
    });

    describe("when the text contains non-ascii characters", () => {
      beforeEach(() => {
        input.text = "αβ αβ αβ";

        document.invalidate().parse();
        assert.equal(
          document.rootNode.toString(),
          "(sentence (word3) (word3) (word3))");
      });

      it("updates the parse tree correctly", () => {
        input.text = "αβδ αβ αβ";

        document.edit({
          startIndex: 2,
          lengthAdded: 1,
          lengthRemoved: 0,
          startPosition: {row: 0, column: 2},
          extentAdded: {row: 0, column: 1},
          extentRemoved: {row: 0, column: 0}
        }).parse();

        assert.equal(
          document.rootNode.toString(),
          "(sentence (word4) (word3) (word3))");
      });
    });

    it("invalidates nodes from previous parses", () => {
      input.text = input.text.slice(1)

      let oldRootNode = document.rootNode
      assert.equal(oldRootNode.isValid(), true)

      document.edit({
        startIndex: 0,
        lengthRemoved: 1,
        lengthAdded: 0,
        startPosition: {row: 0, column: 0},
        extentRemoved: {row: 0, column: 1},
        extentAdded: {row: 0, column: 0}
      }).parse()

      assert.equal(oldRootNode.isValid(), false)
      assert.equal(oldRootNode.name, null)
      assert.equal(oldRootNode.start_index, null)
      assert.equal(oldRootNode.end_index, null)
      assert.equal(oldRootNode.start_point, null)
      assert.equal(oldRootNode.end_point, null)
    });
  });

  describe('.parse', () => {
    it('reports the ranges of text whose syntactic meaning has changed', () => {
      let language = loadLanguage(generate(grammar({
        name: 'test2',
        rules: {
          expression: $ => choice(
            prec.left(seq($.expression, '+', $.expression)),
            $.variable
          ),

          variable: $ => /\w+/,
        }
      })))

      let input = {
        content: 'abcdefg + hij',
        index: 0,

        read () {
          let result = this.content.slice(this.index);
          this.index = Infinity
          return result
        },

        seek (index) {
          this.index = index
        },
      }

      document
        .setLanguage(language)
        .setInput(input)

      let invalidatedRanges = document.parse()
      assert.equal(
        document.rootNode.toString(),
        '(expression (expression (variable)) (expression (variable)))'
      )
      assert.deepEqual(invalidatedRanges, [])

      input.content = 'abc + defg + hij'
      document.edit({
        startIndex: 2,
        lengthAdded: 3,
        lengthRemoved: 0,
        startPosition: {row: 0, column: 2},
        extentAdded: {row: 0, column: 3},
        extentRemoved: {row: 0, column: 0}
      })

      invalidatedRanges = document.parse()
      assert.equal(
        document.rootNode.toString(),
        '(expression (expression (expression (variable)) (expression (variable))) (expression (variable)))'
      )
      assert.deepEqual(invalidatedRanges, [
        {
          start: {row: 0, column: 0},
          end: {row: 0, column: 'abc + defg'.length}
        }
      ])
    })
  })

  describe(".setLogger", () => {
    let debugMessages;

    beforeEach(() => {
      debugMessages = []
      document.setLanguage(language)
      document.setLogger((msg, params) => {
        debugMessages.push(msg)
      })
    });

    it("calls the given callback for each parse event", () => {
      document.setInputString("first-word second-word").parse()
      assert.includeMembers(debugMessages, ['reduce', 'accept', 'shift'])
    });

    it("allows the callback to be retrieved later", () => {
      let callback = () => null;

      document.setLogger(callback)
      assert.equal(callback, document.getLogger())

      document.setLogger(false)
      assert.equal(null, document.getLogger())
    });

    describe("when given a falsy value", () => {
      beforeEach(() => {
        document.setLogger(false)
      });

      it("disables debugging", () => {
        document.setInputString("first-word second-word")
        assert.equal(0, debugMessages.length)
      });
    });

    describe("when given a truthy value that isn't a function", () => {
      it("raises an exception", () => {
        assert.throws((() =>
          document.setLogger("5")
        ), /Debug callback must .* function .* falsy/)
      });
    });

    describe("when the given callback throws an exception", () => {
      let errorMessages, originalConsoleError, thrownError;

      beforeEach(() => {
        errorMessages = []
        thrownError = new Error("dang.")

        originalConsoleError = console.error
        console.error = (message, error) => {
          errorMessages.push([message, error])
        };

        document.setLogger((msg, params) => {
          throw thrownError;
        })
      });

      afterEach(() => {
        console.error = originalConsoleError
      });

      it("logs the error to the console", () => {
        document.setInputString("first-word").parse()

        assert.deepEqual(errorMessages[0], [
          "Error in debug callback:",
          thrownError
        ])
      });
    });
  });
});
