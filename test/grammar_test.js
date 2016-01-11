'use strict';

const assert = require("chai").assert;
const compiler = require("..");
const blank = compiler.dsl.blank;
const choice = compiler.dsl.choice;
const prec = compiler.dsl.prec;
const err = compiler.dsl.err;
const repeat = compiler.dsl.repeat;
const seq = compiler.dsl.seq
const sym = compiler.dsl.sym;
const grammar = compiler.dsl.grammar;
const Document = require("tree-sitter").Document;

describe("Writing a grammar", () => {
  let document

  beforeEach(() => {
    document = new Document()
  });

  describe("rules", () => {
    describe("blank", () => {
      it("matches the empty string", () => {
        let language = compiler.loadLanguage(compiler.compile(grammar({
          name: "test_grammar",
          rules: {
            the_rule: $ => blank()
          }
        })))

        document.setLanguage(language)

        document.setInputString("").parse()
        assert.equal(document.rootNode.toString(), "(the_rule)")

        document.setInputString("not-blank").parse()
        assert.equal(document.rootNode.toString(), "(ERROR (UNEXPECTED 'n'))")
      });
    });

    describe("string", () => {
      it("matches one particular string", () => {
        let language = compiler.loadLanguage(compiler.compile(grammar({
          name: "test_grammar",
          rules: {
            the_rule: $ => "the-string"
          }
        })))

        document.setLanguage(language)

        document.setInputString("the-string").parse()
        assert.equal(document.rootNode.toString(), "(the_rule)")

        document.setInputString("another-string").parse()
        assert.equal(document.rootNode.toString(), "(ERROR (UNEXPECTED 'a'))")
      });
    });

    describe("regex", () => {
      it("matches according to a regular expression", () => {
        let language = compiler.loadLanguage(compiler.compile(grammar({
          name: "test_grammar",
          rules: {
            the_rule: $ => (/[a-c]+/)
          }
        })))

        document.setLanguage(language)

        document.setInputString("abcba").parse()
        assert.equal(document.rootNode.toString(), "(the_rule)")

        document.setInputString("def").parse()
        assert.equal(document.rootNode.toString(), "(ERROR (UNEXPECTED 'd'))")
      });

      it("handles unicode escape sequences in regular expressions", () => {
        let language = compiler.loadLanguage(compiler.compile(grammar({
          name: "test_grammar",
          rules: {
            the_rule: $ => choice(/\u09afb/, /\u19afc/)
          }
        })))

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
        let language = compiler.loadLanguage(compiler.compile(grammar({
          name: "test_grammar",
          rules: {
            the_rule: $ => repeat("o")
          }
        })))

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
        let language = compiler.loadLanguage(compiler.compile(grammar({
          name: "test_grammar",
          rules: {
            the_rule: $ => seq("1", "2", "3")
          }
        })))

        document.setLanguage(language)

        document.setInputString("123").parse()
        assert.equal(document.rootNode.toString(), "(the_rule)")

        document.setInputString("12").parse()
        assert.equal(document.rootNode.toString(), "(ERROR (UNEXPECTED <EOF>))")

        document.setInputString("1234").parse()
        assert.equal(document.rootNode.toString(), "(ERROR (UNEXPECTED '4'))")
      });
    });

    describe("choice", () => {
      it("applies any of a list of rules", () => {
        let language = compiler.loadLanguage(compiler.compile(grammar({
          name: "test_grammar",
          rules: {
            the_rule: $ => choice("1", "2", "3")
          }
        })))

        document.setLanguage(language)

        document.setInputString("1").parse()
        assert.equal(document.rootNode.toString(), "(the_rule)")

        document.setInputString("4").parse()
        assert.equal(document.rootNode.toString(), "(ERROR (UNEXPECTED '4'))")
      });
    });

    describe("symbol", () => {
      it("applies another rule in the grammar by name", () => {
        let language = compiler.loadLanguage(compiler.compile(grammar({
          name: "test_grammar",
          rules: {
            the_rule: $ => seq($.second_rule, "-", $.third_rule),
            second_rule: $ => "one",
            third_rule: $ => "two",
          }
        })))

        document.setLanguage(language)

        document.setInputString("one-two").parse()
        assert.equal(document.rootNode.toString(), "(the_rule (second_rule) (third_rule))")
      });
    });

    describe("prec", () => {
      it("alters the precedence and associativity of the given rule", () => {
        let language = compiler.loadLanguage(compiler.compile(grammar({
          name: "test_grammar",
          rules: {
            _expression: $ => choice($.sum, $.product, $.equation, $.variable),
            product: $ => prec.left(2, seq($._expression, "*", $._expression)),
            sum: $ => prec.left(1, seq($._expression, "+", $._expression)),
            equation: $ => prec.right(0, seq($._expression, "=", $._expression)),
            variable: $ => (/\a+/),
          }
        })))

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

    describe("err", () => {
      it("confines errors to the given subtree", () => {
        let language = compiler.loadLanguage(compiler.compile(grammar({
          name: "test_grammar",
          rules: {
            the_rule: $ => seq($.rule1, err($.rule2), $.rule3, $.rule4),
            rule1: $ => "string1",
            rule2: $ => "string2",
            rule3: $ => "string3",
            rule4: $ => "string4",
          }
        })))

        document.setLanguage(language)

        document.setInputString("string1 SOMETHING_ELSE string3 string4").parse()
        assert.equal(
          document.rootNode.toString(),
          "(the_rule (rule1) (ERROR (UNEXPECTED 'S')) (rule3) (rule4))")
        document.setInputString("string1 string2 SOMETHING_ELSE string4").parse()
        assert.equal(
          document.rootNode.toString(),
          "(ERROR (rule1) (rule2) (UNEXPECTED 'S') (rule4))")
      });
    });
  });

  describe("extra tokens", () => {
    it("allows the given tokens to appear anywhere in the input", () => {
      let language = compiler.loadLanguage(compiler.compile(grammar({
        name: "test_grammar",
        extras: $ => [$.ellipsis, " "],
        rules: {
          the_rule: $ => repeat($.word),
          word: $ => (/\w+/),
          ellipsis: $ => "...",
        }
      })));

      document.setLanguage(language);

      document.setInputString("one two ... three ... four").parse();

      assert.equal(
        document.rootNode.toString(),
        "(the_rule (word) (word) (ellipsis) (word) (ellipsis) (word))");
    });

    it("allows anonymous rules to be provided", () => {
      let language = compiler.loadLanguage(compiler.compile(grammar({
        name: "test_grammar",
        extras: $ => ["...", "---"],
        rules: {
          the_rule: $ => repeat($.word),
          word: $ => "hello",
        }
      })));

      document.setLanguage(language);

      document.setInputString("hello...hello---hello").parse();
      assert.equal(document.rootNode.toString(), "(the_rule (word) (word) (word))");

      document.setInputString("hello hello").parse();
      assert.equal(document.rootNode.toString(), "(ERROR (word) (UNEXPECTED ' ') (word))");
    });

    it("defaults to whitespace characters", () => {
      let language = compiler.loadLanguage(compiler.compile(grammar({
        name: "test_grammar",
        rules: {
          the_rule: $ => repeat($.word),
          word: $ => "hello",
        }
      })))

      document.setLanguage(language)

      document.setInputString("hello hello\thello\nhello\rhello").parse()
      assert.equal(document.rootNode.toString(), "(the_rule (word) (word) (word) (word) (word))")

      document.setInputString("hello.hello").parse()
      assert.equal(document.rootNode.toString(), "(ERROR (word) (UNEXPECTED '.') (word))")
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
        compiler.compile(grammar(grammarOptions));
      } catch (e) {
        assert.match(e.message, /Unresolved conflict/);
        threw = true;
      }

      assert.ok(threw, "Expected a conflict exception")

      grammarOptions.conflicts = $ => [
        [$.first_rule, $.second_rule]
      ]

      let language = compiler.loadLanguage(compiler.compile(grammar(grammarOptions)))
      document.setLanguage(language)

      document.setInputString("a b c d").parse()
      assert.equal("(sentence (first_rule))", document.rootNode.toString())

      document.setInputString("a b c e").parse()
      assert.equal("(sentence (second_rule))", document.rootNode.toString())
    });
  });

  describe("error handling", () => {
    describe("when the grammar has conflicts", () => {
      it("raises an error describing the conflict", () => {
        let threw = false;

        try {
          compiler.compile(grammar({
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
        ), /Grammar.*rules.*object/)
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

    describe("when the grammar's ubiquitous value is not a function", () => {
      it("raises an error", () => {
        assert.throws((() =>
          grammar({
            ubiquitous: [],
            name: "test_grammar",
            rules: {
              the_rule: $ => blank()
            }
          })
        ), /Grammar.*ubiquitous.*function/)
      });
    });

    describe("when one of the grammar's ubiquitous tokens is not a token", () => {
      it("raises an error", () => {
        let threw = false;

        try {
          compiler.compile(grammar({
            name: "test_grammar",
            ubiquitous: $ => [$.yyy],
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
          compiler.compile(grammar({
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
