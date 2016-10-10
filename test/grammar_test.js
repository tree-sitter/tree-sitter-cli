'use strict';

const jsonSchema = require('jsonschema');
const {assert} = require("chai");
const {dsl, generate, loadLanguage} = require("..");
const {blank, choice, prec, repeat, seq, sym, grammar} = dsl
const {Document} = require("tree-sitter")
const GRAMMAR_SCHEMA = require("../vendor/tree-sitter/doc/grammar-schema")
const schemaValidator = new jsonSchema.Validator();

describe("Writing a grammar", () => {
  let document

  beforeEach(() => {
    document = new Document()
  });

  describe("rules", () => {
    describe("blank", () => {
      it("matches the empty string", () => {
        let language = generateAndLoadLanguage(grammar({
          name: "test_grammar",
          rules: {
            the_rule: $ => blank()
          }
        }))

        document.setLanguage(language)

        document.setInputString("").parse()
        assert.equal(document.rootNode.toString(), "(the_rule)")

        document.setInputString("not-blank").parse()
        assert.equal(document.rootNode.toString(), "(ERROR (UNEXPECTED 'n'))")
      });
    });

    describe("string", () => {
      it("matches one particular string", () => {
        let language = generateAndLoadLanguage(grammar({
          name: "test_grammar",
          rules: {
            the_rule: $ => "the-string"
          }
        }))

        document.setLanguage(language)

        document.setInputString("the-string").parse()
        assert.equal(document.rootNode.toString(), "(the_rule)")

        document.setInputString("another-string").parse()
        assert.equal(document.rootNode.toString(), "(ERROR (UNEXPECTED 'a'))")
      });
    });

    describe("regex", () => {
      it("matches according to a regular expression", () => {
        let language = generateAndLoadLanguage(grammar({
          name: "test_grammar",
          rules: {
            the_rule: $ => (/[a-c]+/)
          }
        }))

        document.setLanguage(language)

        document.setInputString("abcba").parse()
        assert.equal(document.rootNode.toString(), "(the_rule)")

        document.setInputString("def").parse()
        assert.equal(document.rootNode.toString(), "(ERROR (UNEXPECTED 'd'))")
      });

      it("handles unicode escape sequences in regular expressions", () => {
        let language = generateAndLoadLanguage(grammar({
          name: "test_grammar",
          rules: {
            the_rule: $ => choice(/\u09afb/, /\u19afc/)
          }
        }))

        document.setLanguage(language)

        document.setInputString("\u09af" + "b").parse()
        assert.equal(document.rootNode.toString(), "(the_rule)")

        document.setInputString("\u09af" + "c").parse()
        assert.equal(document.rootNode.toString(), "(ERROR (UNEXPECTED 'c'))")

        document.setInputString("\u19af" + "c").parse()
        assert.equal(document.rootNode.toString(), "(the_rule)")
      });
    });

    describe("repeat", () => {
      it("applies the given rule any number of times", () => {
        let language = generateAndLoadLanguage(grammar({
          name: "test_grammar",
          rules: {
            the_rule: $ => repeat("o")
          }
        }))

        document.setLanguage(language)

        document.setInputString("").parse()
        assert.equal(document.rootNode.toString(), "(the_rule)")

        document.setInputString("o").parse()
        assert.equal(document.rootNode.toString(), "(the_rule)")

        document.setInputString("ooo").parse()
        assert.equal(document.rootNode.toString(), "(the_rule)")
      });
    });

    describe("sequence", () => {
      it("applies a list of other rules in sequence", () => {
        let language = generateAndLoadLanguage(grammar({
          name: "test_grammar",
          rules: {
            the_rule: $ => seq("1", "2", "3")
          }
        }))

        document.setLanguage(language)

        document.setInputString("123").parse()
        assert.equal(document.rootNode.toString(), "(the_rule)")

        document.setInputString("12").parse()
        assert.equal(document.rootNode.toString(), "(ERROR)")

        document.setInputString("1234").parse()
        assert.equal(document.rootNode.toString(), "(ERROR (the_rule) (UNEXPECTED '4'))")
      });
    });

    describe("choice", () => {
      it("applies any of a list of rules", () => {
        let language = generateAndLoadLanguage(grammar({
          name: "test_grammar",
          rules: {
            the_rule: $ => choice("1", "2", "3")
          }
        }))

        document.setLanguage(language)

        document.setInputString("1").parse()
        assert.equal(document.rootNode.toString(), "(the_rule)")

        document.setInputString("4").parse()
        assert.equal(document.rootNode.toString(), "(ERROR (UNEXPECTED '4'))")
      });
    });

    describe("symbol", () => {
      it("applies another rule in the grammar by name", () => {
        let language = generateAndLoadLanguage(grammar({
          name: "test_grammar",
          rules: {
            the_rule: $ => seq($.second_rule, "-", $.third_rule),
            second_rule: $ => "one",
            third_rule: $ => "two",
          }
        }))

        document.setLanguage(language)

        document.setInputString("one-two").parse()
        assert.equal(document.rootNode.toString(), "(the_rule (second_rule) (third_rule))")
      });
    });

    describe("prec", () => {
      it("alters the precedence and associativity of the given rule", () => {
        let language = generateAndLoadLanguage(grammar({
          name: "test_grammar",
          rules: {
            _expression: $ => choice($.sum, $.product, $.equation, $.variable),
            product: $ => prec.left(2, seq($._expression, "*", $._expression)),
            sum: $ => prec.left(1, seq($._expression, "+", $._expression)),
            equation: $ => prec.right(0, seq($._expression, "=", $._expression)),
            variable: $ => (/\a+/),
          }
        }))

        document.setLanguage(language)

        // product has higher precedence than sum
        document.setInputString("a + b * c").parse()
        assert.equal(document.rootNode.toString(), "(sum (variable) (product (variable) (variable)))")
        document.setInputString("a * b + c").parse()
        assert.equal(document.rootNode.toString(), "(sum (product (variable) (variable)) (variable))")

        // product and sum are left-associative
        document.setInputString("a * b * c").parse()
        assert.equal(document.rootNode.toString(), "(product (product (variable) (variable)) (variable))")
        document.setInputString("a + b + c").parse()
        assert.equal(document.rootNode.toString(), "(sum (sum (variable) (variable)) (variable))")

        // equation is right-associative
        document.setInputString("a = b = c").parse()
        assert.equal(document.rootNode.toString(), "(equation (variable) (equation (variable) (variable)))")
      });
    });
  });

  describe("extra tokens", () => {
    it("allows the given tokens to appear anywhere in the input", () => {
      let language = generateAndLoadLanguage(grammar({
        name: "test_grammar",
        extras: $ => [$.ellipsis, " "],
        rules: {
          the_rule: $ => repeat($.word),
          word: $ => (/\w+/),
          ellipsis: $ => "...",
        }
      }));

      document.setLanguage(language);

      document.setInputString("one two ... three ... four").parse();

      assert.equal(
        document.rootNode.toString(),
        "(the_rule (word) (word) (ellipsis) (word) (ellipsis) (word))");
    });

    it("allows anonymous rules to be provided", () => {
      let language = generateAndLoadLanguage(grammar({
        name: "test_grammar",
        extras: $ => ["...", "---"],
        rules: {
          the_rule: $ => repeat($.word),
          word: $ => "hello",
        }
      }));

      document.setLanguage(language);

      document.setInputString("hello...hello---hello").parse();
      assert.equal(document.rootNode.toString(), "(the_rule (word) (word) (word))");

      document.setInputString("hello hello").parse();
      assert.equal(document.rootNode.toString(), "(the_rule (word) (ERROR (UNEXPECTED ' ')) (word))");
    });

    it("defaults to whitespace characters", () => {
      let language = generateAndLoadLanguage(grammar({
        name: "test_grammar",
        rules: {
          the_rule: $ => repeat($.word),
          word: $ => "hello",
        }
      }))

      document.setLanguage(language)

      document.setInputString("hello hello\thello\nhello\rhello").parse()
      assert.equal(document.rootNode.toString(), "(the_rule (word) (word) (word) (word) (word))")

      document.setInputString("hello.hello").parse()
      assert.equal(document.rootNode.toString(), "(the_rule (word) (ERROR (UNEXPECTED '.')) (word))")
    });
  });

  describe("expected conflicts", () => {
    it("causes the grammar to work even with LR(1), conflicts", () => {
      let grammarOptions = {
        name: "test_grammar",
        rules: {
          sentence: $ => choice(
            seq($.first_rule, "c", "d"),
            seq($.second_rule, "c", "e")
          ),

          first_rule: $ => seq("a", "b"),

          second_rule: $ => seq("a", "b"),
        }
      };

      let threw = false;

      try {
        generate(grammar(grammarOptions));
      } catch (e) {
        assert.match(e.message, /Unresolved conflict/);
        threw = true;
      }

      assert.ok(threw, "Expected a conflict exception")

      grammarOptions.conflicts = $ => [
        [$.first_rule, $.second_rule]
      ]

      let language = generateAndLoadLanguage(grammar(grammarOptions))
      document.setLanguage(language)

      document.setInputString("a b c d").parse()
      assert.equal("(sentence (first_rule))", document.rootNode.toString())

      document.setInputString("a b c e").parse()
      assert.equal("(sentence (second_rule))", document.rootNode.toString())
    });
  });

  describe("extending another grammar", () => {
    it("allows rules, extras, and conflicts to be added", () => {
      let grammar1 = grammar({
        name: 'grammar1',
        extras: $ => [' '],
        rules: {
          thing: $ => repeat($.triple),
          triple: $ => seq($.word, $.word, $.word),
          word: $ => (/\w+/)
        }
      });

      document.setLanguage(generateAndLoadLanguage(grammar1))
      document.setInputString("one two three").parse()
      assert.equal(document.rootNode.toString(), "(thing (triple (word) (word) (word)))");

      document.setInputString("one two ... three").parse()
      assert.equal(document.rootNode.toString(), "(thing (triple (word) (word) (ERROR (UNEXPECTED '.')) (word)))")

      let grammar2 = grammar(grammar1, {
        name: "grammar2",
        extras: ($, original) => original.concat([ $.ellipsis ]),
        rules: {
          ellipsis: $ => '...'
        }
      })

      document.setLanguage(generateAndLoadLanguage(grammar2))
      document.setInputString("one two ... three").parse()
      assert.equal(document.rootNode.toString(), "(thing (triple (word) (word) (ellipsis) (word)))")

      document.setInputString("one two ... three ... four").parse()
      assert.equal(document.rootNode.toString(), "(thing (triple (word) (word) (ellipsis) (word)) (ellipsis) (ERROR (word)))")

      let grammar3 = grammar(grammar2, {
        name: "grammar3",
        conflicts: $ => [[$.triple, $.double]],
        rules: {
          thing: ($, original) => choice(
            original,
            repeat($.double)
          ),
          double: $ => seq($.word, $.word),
        }
      });

      document.setLanguage(generateAndLoadLanguage(grammar3));
      document.setInputString("one two ... three ... four").parse();
      assert.equal(
        document.rootNode.toString(),
        "(thing (double (word) (word)) (ellipsis) (double (word) (ellipsis) (word)))");
    });
  });

  describe("error handling", () => {
    describe("when the grammar has conflicts", () => {
      it("raises an error describing the conflict", () => {
        let threw = false;

        try {
          generate(grammar({
            name: "test_grammar",
            rules: {
              sentence: $ => choice($.first_rule, $.second_rule),
              first_rule: $ => seq("things", "stuff"),
              second_rule: $ => seq("things", "stuff"),
            }
          }));
        } catch (e) {
          assert.match(e.message, /Unresolved conflict/);
          assert.match(e.message, /Lookahead symbol: END_OF_INPUT/);
          assert.match(e.message, /first_rule -> 'things' 'stuff'/);
          assert.match(e.message, /second_rule -> 'things' 'stuff'/);
          assert.property(e, "isGrammarError");
          threw = true;
        }

        assert.ok(threw, "Expected an exception!");
      });
    });

    describe("when the grammar has no name", () => {
      it("raises an error", () => {
        assert.throws((() =>
          grammar({
            rules: {
              the_rule: $ => blank()
            }
          })
        ), /Grammar.*name.*string/)

        assert.throws((() =>
          grammar({
            name: {},
            rules: {
              the_rule: $ => blank()
            }
          })
        ), /Grammar.*name.*string/)
      });
    });

    describe("when the grammar has no rules", () => {
      it("raises an error", () => {
        assert.throws((() =>
          grammar({
            name: "test_grammar",
          })
        ), /Grammar.*must have.*rule/)
      });
    });

    describe("when the grammar contains a reference to an undefined rule", () => {
      it("throws an error with the rule name", () => {
        assert.throws((() =>
          grammar({
            name: "test_grammar",
            rules: {
              something: $ => seq("(", $.something_else, ")")
            }
          })
        ), /Undefined.*rule.*something_else/)
      });
    });

    describe("when one of the grammar rules is not a function", () => {
      it("raises an error", () => {
        assert.throws((() =>
          grammar({
            name: "test_grammar",
            rules: {
              the_rule: blank()
            }
          })
        ), /Grammar.*rule.*function.*the_rule/)
      });
    });

    describe("when the grammar's extras value is not a function", () => {
      it("raises an error", () => {
        assert.throws((() =>
          grammar({
            extras: [],
            name: "test_grammar",
            rules: {
              the_rule: $ => blank()
            }
          })
        ), /Grammar.*extras.*function/)
      });
    });

    describe("when one of the grammar's extras tokens is not a token", () => {
      it("raises an error", () => {
        let threw = false;

        try {
          generate(grammar({
            name: "test_grammar",
            extras: $ => [$.yyy],
            rules: {
              xxx: $ => seq($.yyy, $.yyy),
              yyy: $ => seq($.zzz, $.zzz),
              zzz: $ => "zzz",
            }
          }))
        } catch (e) {
          assert.match(e.message, /Not a token.*yyy/)
          assert.property(e, "isGrammarError")
          threw = true
        }

        assert.ok(threw, "Expected an exception!")
      });
    });

    describe("when a symbol references an undefined rule", () => {
      it("raises an error", () => {
        assert.throws((() =>
          generate(grammar({
            name: "test_grammar",
            rules: {
              xxx: $ => sym("yyy")
            }
          }))
        ), /Undefined.*rule.*yyy/)
      });
    });
  });
});

function generateAndLoadLanguage (grammar) {
  var validation = schemaValidator.validate(grammar, GRAMMAR_SCHEMA);
  if (!validation.valid) {
    throw new Error(validation.errors[0]);
  }
  return loadLanguage(generate(grammar));
}
