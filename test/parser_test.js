const Parser = require("tree-sitter");
const { assert } = require("chai");
const { dsl, generate, loadLanguage } = require("..");
const { choice, prec, repeat, seq, grammar } = dsl;

describe("Parser", () => {
  let parser, language;

  before(() => {
    language = loadLanguage(
      generate(
        grammar({
          name: "test",
          rules: {
            sentence: $ => repeat(choice($.word1, $.word2, $.word3, $.word4)),
            word1: $ => "first-word",
            word2: $ => "second-word",
            word3: $ => "αβ",
            word4: $ => "αβδ"
          }
        })
      )
    );
  });

  beforeEach(() => {
    parser = new Parser();
  });

  describe(".setLanguage", () => {
    describe("when the supplied object is not a tree-sitter language", () => {
      it("throws an exception", () => {
        assert.throws(() => parser.setLanguage({}), /Invalid language/);

        assert.throws(() => parser.setLanguage(undefined), /Invalid language/);
      });
    });

    describe("when the input has not yet been set", () => {
      it("doesn't try to parse", () => {
        parser.setLanguage(language);
        assert.equal(null, parser.children);
      });
    });
  });

  describe(".setLogger", () => {
    let debugMessages;

    beforeEach(() => {
      debugMessages = [];
      parser.setLanguage(language);
      parser.setLogger((msg, params) => {
        debugMessages.push(msg);
      });
    });

    it("calls the given callback for each parse event", () => {
      parser.parse("first-word second-word");
      assert.includeMembers(debugMessages, ["reduce", "accept", "shift"]);
    });

    it("allows the callback to be retrieved later", () => {
      let callback = () => null;

      parser.setLogger(callback);
      assert.equal(callback, parser.getLogger());

      parser.setLogger(false);
      assert.equal(null, parser.getLogger());
    });

    describe("when given a falsy value", () => {
      beforeEach(() => {
        parser.setLogger(false);
      });

      it("disables debugging", () => {
        parser.parse("first-word second-word");
        assert.equal(0, debugMessages.length);
      });
    });

    describe("when given a truthy value that isn't a function", () => {
      it("raises an exception", () => {
        assert.throws(
          () => parser.setLogger("5"),
          /Debug callback must .* function .* falsy/
        );
      });
    });

    describe("when the given callback throws an exception", () => {
      let errorMessages, originalConsoleError, thrownError;

      beforeEach(() => {
        errorMessages = [];
        thrownError = new Error("dang.");

        originalConsoleError = console.error;
        console.error = (message, error) => {
          errorMessages.push([message, error]);
        };

        parser.setLogger((msg, params) => {
          throw thrownError;
        });
      });

      afterEach(() => {
        console.error = originalConsoleError;
      });

      it("logs the error to the console", () => {
        parser.parse("first-word");

        assert.deepEqual(errorMessages[0], [
          "Error in debug callback:",
          thrownError
        ]);
      });
    });
  });

  describe(".parse", () => {
    beforeEach(() => {
      parser.setLanguage(language);
    });

    it("reads from the given input", () => {
      parser.setLanguage(language);

      const tree = parser.parse({
        read: function() {
          return ["first", "-", "word", " ", "second", "-", "word", ""][
            this._readIndex++
          ];
        },

        seek: function() {},

        _readIndex: 0
      });

      assert.equal("(sentence (word1) (word2))", tree.rootNode.toString());
    });

    describe("when the input.read() returns something other than a string", () => {
      it("stops reading", () => {
        parser.setLanguage(language);
        const input = {
          read: function() {
            return ["first", "-", "word", {}, "second-word", " "][
              this._readIndex++
            ];
          },

          seek: () => 0,

          _readIndex: 0
        };
        const tree = parser.parse(input);

        assert.equal("(sentence (word1))", tree.rootNode.toString());
        assert.equal(4, input._readIndex);
      });
    });

    describe("when the given input is not an object", () => {
      it("throws an exception", () => {
        assert.throws(() => parser.parse(null), /Input.*object/);
        assert.throws(() => parser.parse(5), /Input.*object/);
      });
    });

    describe("when the given input does not implement ::seek(n)", () => {
      it("throws an exception", () => {
        assert.throws(
          () =>
            parser.parse({
              read: () => ""
            }),
          /Input.*implement.*seek/
        );
      });
    });

    describe("when the given input does not implement ::read()", () => {
      it("throws an exception", () => {
        assert.throws(
          () =>
            parser.parse({
              seek: n => 0
            }),
          /Input.*implement.*read/
        );
      });
    });

    it("handles long input strings", () => {
      const repeatCount = 10000;
      const wordCount = 4 * repeatCount;
      const inputString = "first-word second-word αβ αβδ".repeat(repeatCount);

      const tree = parser.parse(inputString);
      assert.equal(tree.rootNode.type, "sentence");
      assert.equal(tree.rootNode.children.length, wordCount);
    });
  });
});
