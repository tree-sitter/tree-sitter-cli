const Parser = require("tree-sitter");
const path = require("path");
const { assert } = require("chai");
const { dsl, generate, loadLanguage } = require("..");
const { alias, blank, choice, prec, repeat, seq, sym, grammar } = dsl;
const jsonSchema = require("jsonschema");
const GRAMMAR_SCHEMA = require("../vendor/tree-sitter/src/compiler/grammar-schema");

const schemaValidator = new jsonSchema.Validator();

describe("Writing a grammar", () => {
  let parser, tree;

  beforeEach(() => {
    parser = new Parser();
  });

  describe("rules", () => {
    describe("blank", () => {
      it("matches the empty string", () => {
        const language = generateAndLoadLanguage(
          grammar({
            name: "test_grammar",
            rules: {
              the_rule: $ => blank()
            }
          })
        );

        parser.setLanguage(language);

        tree = parser.parse("");
        assert.equal(tree.rootNode.toString(), "(the_rule)");

        tree = parser.parse("not-blank");
        assert.equal(
          tree.rootNode.toString(),
          "(the_rule (ERROR (UNEXPECTED 'n')))"
        );
      });
    });

    describe("string", () => {
      it("matches one particular string", () => {
        const language = generateAndLoadLanguage(
          grammar({
            name: "test_grammar",
            rules: {
              the_rule: $ => "the-string"
            }
          })
        );

        parser.setLanguage(language);

        tree = parser.parse("the-string");
        assert.equal(tree.rootNode.toString(), "(the_rule)");

        tree = parser.parse("another-string");
        assert.equal(tree.rootNode.toString(), "(ERROR (UNEXPECTED 'a'))");
      });
    });

    describe("regex", () => {
      it("matches according to a regular expression", () => {
        const language = generateAndLoadLanguage(
          grammar({
            name: "test_grammar",
            rules: {
              the_rule: $ => /[a-c]+/
            }
          })
        );

        parser.setLanguage(language);

        tree = parser.parse("abcba");
        assert.equal(tree.rootNode.toString(), "(the_rule)");

        tree = parser.parse("def");
        assert.equal(tree.rootNode.toString(), "(ERROR (UNEXPECTED 'd'))");
      });

      it("handles unicode escape sequences in regular expressions", () => {
        const language = generateAndLoadLanguage(
          grammar({
            name: "test_grammar",
            rules: {
              the_rule: $ => choice(/\u09afb/, /\u19afc/)
            }
          })
        );

        parser.setLanguage(language);

        tree = parser.parse("\u09af" + "b");
        assert.equal(tree.rootNode.toString(), "(the_rule)");

        tree = parser.parse("\u09af" + "c");
        assert.equal(tree.rootNode.toString(), "(ERROR (UNEXPECTED 'c'))");

        tree = parser.parse("\u19af" + "c");
        assert.equal(tree.rootNode.toString(), "(the_rule)");
      });
    });

    describe("array", () => {
      it("matches a sequence of rules", () => {
        const language = generateAndLoadLanguage(
          grammar({
            name: "test_grammar",
            rules: {
              the_rule: $ => ["the", " ", "strings"]
            }
          })
        );

        parser.setLanguage(language);

        tree = parser.parse("the strings");
        assert.equal(tree.rootNode.toString(), "(the_rule)");

        tree = parser.parse("another-string");
        assert.equal(tree.rootNode.toString(),
          "(ERROR (ERROR (UNEXPECTED 'a')) (UNEXPECTED 'r'))");
      });
    });

    describe("repeat", () => {
      it("applies the given rule any number of times", () => {
        const language = generateAndLoadLanguage(
          grammar({
            name: "test_grammar",
            rules: {
              the_rule: $ => repeat("o")
            }
          })
        );

        parser.setLanguage(language);

        tree = parser.parse("");
        assert.equal(tree.rootNode.toString(), "(the_rule)");

        tree = parser.parse("o");
        assert.equal(tree.rootNode.toString(), "(the_rule)");

        tree = parser.parse("ooo");
        assert.equal(tree.rootNode.toString(), "(the_rule)");
      });

      it("implicitly sequences multiple arguments", () => {
        const language = generateAndLoadLanguage(
          grammar({
            name: "test_grammar",
            rules: {
              the_rule: $ => repeat("h", "i")
            }
          })
        );

        parser.setLanguage(language);

        tree = parser.parse("");
        assert.equal(tree.rootNode.toString(), "(the_rule)");

        tree = parser.parse("hi");
        assert.equal(tree.rootNode.toString(), "(the_rule)");

        tree = parser.parse("hihi");
        assert.equal(tree.rootNode.toString(), "(the_rule)");
      });
    });

    describe("sequence", () => {
      it("applies a list of other rules in sequence", () => {
        const language = generateAndLoadLanguage(
          grammar({
            name: "test_grammar",
            rules: {
              the_rule: $ => seq("1", "2", "3")
            }
          })
        );

        parser.setLanguage(language);

        tree = parser.parse("123");
        assert.equal(tree.rootNode.toString(), "(the_rule)");

        tree = parser.parse("12");
        assert.equal(tree.rootNode.toString(), "(the_rule (MISSING))");

        tree = parser.parse("1234");
        assert.equal(
          tree.rootNode.toString(),
          "(the_rule (ERROR (UNEXPECTED '4')))"
        );
      });
    });

    describe("choice", () => {
      it("applies any of a list of rules", () => {
        const language = generateAndLoadLanguage(
          grammar({
            name: "test_grammar",
            rules: {
              the_rule: $ => choice("1", "2", "3")
            }
          })
        );

        parser.setLanguage(language);

        tree = parser.parse("1");
        assert.equal(tree.rootNode.toString(), "(the_rule)");

        tree = parser.parse("4");
        assert.equal(tree.rootNode.toString(), "(ERROR (UNEXPECTED '4'))");
      });
    });

    describe("symbol", () => {
      it("applies another rule in the grammar by name", () => {
        const language = generateAndLoadLanguage(
          grammar({
            name: "test_grammar",
            rules: {
              the_rule: $ => seq($.second_rule, "-", $.third_rule),
              second_rule: $ => "one",
              third_rule: $ => "two"
            }
          })
        );

        parser.setLanguage(language);

        tree = parser.parse("one-two");
        assert.equal(
          tree.rootNode.toString(),
          "(the_rule (second_rule) (third_rule))"
        );
      });
    });

    describe("prec", () => {
      it("alters the precedence and associativity of the given rule", () => {
        const language = generateAndLoadLanguage(
          grammar({
            name: "test_grammar",
            rules: {
              expression: $ => $._expression,
              _expression: $ =>
                choice($.sum, $.product, $.equation, $.variable),
              product: $ =>
                prec.left(2, seq($._expression, "*", $._expression)),
              sum: $ => prec.left(1, seq($._expression, "+", $._expression)),
              equation: $ =>
                prec.right(0, seq($._expression, "=", $._expression)),
              variable: $ => /[a-z]+/
            }
          })
        );

        parser.setLanguage(language);

        // product has higher precedence than sum
        tree = parser.parse("a + b * c");
        assert.equal(
          tree.rootNode.toString(),
          "(expression (sum (variable) (product (variable) (variable))))"
        );
        tree = parser.parse("a * b + c");
        assert.equal(
          tree.rootNode.toString(),
          "(expression (sum (product (variable) (variable)) (variable)))"
        );

        // product and sum are left-associative
        tree = parser.parse("a * b * c");
        assert.equal(
          tree.rootNode.toString(),
          "(expression (product (product (variable) (variable)) (variable)))"
        );
        tree = parser.parse("a + b + c");
        assert.equal(
          tree.rootNode.toString(),
          "(expression (sum (sum (variable) (variable)) (variable)))"
        );

        // equation is right-associative
        tree = parser.parse("a = b = c");
        assert.equal(
          tree.rootNode.toString(),
          "(expression (equation (variable) (equation (variable) (variable))))"
        );
      });
    });

    describe("alias", () => {
      it("assigns syntax nodes matched by the given rule an alternative name", () => {
        const language = generateAndLoadLanguage(
          grammar({
            name: "test_grammar",
            rules: {
              rule_1: $ => seq(alias($.rule_2, $.rule_2000), "\n", $.rule_3),
              rule_2: $ => "#two",
              rule_3: $ => alias(/#[ \t]*three/, "#three")
            }
          })
        );

        parser.setLanguage(language);
        tree = parser.parse("#two\n#  three");
        assert.equal(tree.rootNode.toString(), "(rule_1 (rule_2000) (rule_3))");

        const rule2Node = tree.rootNode.namedChildren[0];
        assert.equal(rule2Node.namedChildren.length, 0);
        assert.equal(rule2Node.children.length, 0);

        const rule3Node = tree.rootNode.namedChildren[1];
        assert.equal(rule3Node.namedChildren.length, 0);
        assert.deepEqual(rule3Node.children.map(node => node.type), ["#three"]);
        assert.deepEqual(rule3Node.children.map(node => node.isNamed), [false]);
      });
    });
  });

  describe("inlining rules", () => {
    it("duplicates the content of the specified rules at all of their usage sites", () => {
      const language = generateAndLoadLanguage(
        grammar({
          name: "test_grammar",
          inline: $ => [$.rule_c],
          rules: {
            rule_a: $ => seq($.rule_b, $.rule_c),
            rule_b: $ => "b",
            rule_c: $ => seq($.rule_d, $.rule_e),
            rule_d: $ => "d",
            rule_e: $ => "e"
          }
        })
      );

      parser.setLanguage(language);

      tree = parser.parse("b d e");
      assert.equal(
        tree.rootNode.toString(),
        "(rule_a (rule_b) (rule_d) (rule_e))"
      );
    });
  });

  describe("extra tokens", () => {
    it("allows the given tokens to appear anywhere in the input", () => {
      const language = generateAndLoadLanguage(
        grammar({
          name: "test_grammar",
          extras: $ => [$.ellipsis, " "],
          rules: {
            the_rule: $ => repeat($.word),
            word: $ => /\w+/,
            ellipsis: $ => "..."
          }
        })
      );

      parser.setLanguage(language);

      tree = parser.parse("one two ... three ... four");

      assert.equal(
        tree.rootNode.toString(),
        "(the_rule (word) (word) (ellipsis) (word) (ellipsis) (word))"
      );
    });

    it("allows anonymous rules to be provided", () => {
      const language = generateAndLoadLanguage(
        grammar({
          name: "test_grammar",
          extras: $ => ["...", "---"],
          rules: {
            the_rule: $ => repeat($.word),
            word: $ => "hello"
          }
        })
      );

      parser.setLanguage(language);

      tree = parser.parse("hello...hello---hello");
      assert.equal(tree.rootNode.toString(), "(the_rule (word) (word) (word))");

      tree = parser.parse("hello hello");
      assert.equal(
        tree.rootNode.toString(),
        "(the_rule (word) (ERROR (UNEXPECTED ' ')) (word))"
      );
    });

    it("defaults to whitespace characters", () => {
      const language = generateAndLoadLanguage(
        grammar({
          name: "test_grammar",
          rules: {
            the_rule: $ => repeat($.word),
            word: $ => "hello"
          }
        })
      );

      parser.setLanguage(language);

      tree = parser.parse("hello hello\thello\nhello\rhello");
      assert.equal(
        tree.rootNode.toString(),
        "(the_rule (word) (word) (word) (word) (word))"
      );

      tree = parser.parse("hello.hello");
      assert.equal(
        tree.rootNode.toString(),
        "(the_rule (word) (ERROR (UNEXPECTED '.')) (word))"
      );
    });
  });

  describe("expected conflicts", () => {
    it("causes the grammar to work even with LR(1) conflicts", () => {
      let grammarOptions = {
        name: "test_grammar",
        rules: {
          sentence: $ =>
            choice(seq($.first_rule, "c", "d"), seq($.second_rule, "c", "e")),

          first_rule: $ => seq("a", "b"),

          second_rule: $ => seq("a", "b")
        }
      };

      let threw = false;

      try {
        generate(grammar(grammarOptions));
      } catch (e) {
        assert.match(e.message, /Unresolved conflict/);
        threw = true;
      }

      assert.ok(threw, "Expected a conflict exception");

      grammarOptions.conflicts = $ => [[$.first_rule, $.second_rule]];

      const language = generateAndLoadLanguage(grammar(grammarOptions));
      parser.setLanguage(language);

      tree = parser.parse("a b c d");
      assert.equal("(sentence (first_rule))", tree.rootNode.toString());

      tree = parser.parse("a b c e");
      assert.equal("(sentence (second_rule))", tree.rootNode.toString());
    });

    it("allows ambiguities to be resolved via dynamic precedence", () => {
      let callPrecedence = -1;

      const grammarOptions = {
        name: "test_grammar",
        conflicts: $ => [[$.expression, $.command], [$.call, $.command]],
        rules: {
          expression: $ =>
            choice($.call, $.command, $.parenthesized, $.identifier),

          call: $ =>
            prec.dynamic(
              callPrecedence,
              seq(
                $.expression,
                "(",
                $.expression,
                repeat(seq(",", $.expression)),
                ")"
              )
            ),

          command: $ => seq($.identifier, $.expression),

          parenthesized: $ => seq("(", $.expression, ")"),

          identifier: $ => /[a-z]+/
        }
      };

      parser.setLanguage(generateAndLoadLanguage(grammar(grammarOptions)));
      tree = parser.parse("a(b)");
      assert.equal(
        tree.rootNode.toString(),
        "(expression (command (identifier) (expression (parenthesized (expression (identifier))))))"
      );

      callPrecedence = 1;
      parser.setLanguage(generateAndLoadLanguage(grammar(grammarOptions)));
      tree = parser.parse("a(b)");
      assert.equal(
        tree.rootNode.toString(),
        "(expression (call (expression (identifier)) (expression (identifier))))"
      );
    });
  });

  describe("external tokens", function() {
    it("causes the grammar to work even with LR(1) conflicts", () => {
      const language = generateAndLoadLanguage(
        grammar({
          name: "test_grammar",
          externals: $ => [$.external_a, $.external_b],
          rules: {
            program: $ => seq($.external_a, $.external_b)
          }
        }),
        [path.join(__dirname, "fixtures", "external_scan.c")]
      );

      parser.setLanguage(language);
      tree = parser.parse("a b");
      assert.equal(
        tree.rootNode.toString(),
        "(program (external_a) (external_b))"
      );
    });
  });

  describe("extending another grammar", () => {
    it("allows rules, extras, and conflicts to be added", () => {
      let grammar1 = grammar({
        name: "grammar1",
        extras: $ => [" "],
        rules: {
          thing: $ => repeat($.triple),
          triple: $ => seq($.word, $.word, $.word),
          word: $ => /\w+/
        }
      });

      parser.setLanguage(generateAndLoadLanguage(grammar1));
      tree = parser.parse("one two three");
      assert.equal(
        tree.rootNode.toString(),
        "(thing (triple (word) (word) (word)))"
      );

      tree = parser.parse("one two ... three");
      assert.equal(
        tree.rootNode.toString(),
        "(thing (triple (word) (word) (ERROR (UNEXPECTED '.')) (word)))"
      );

      let grammar2 = grammar(grammar1, {
        name: "grammar2",
        extras: ($, original) => original.concat([$.ellipsis]),
        rules: {
          ellipsis: $ => "..."
        }
      });

      parser.setLanguage(generateAndLoadLanguage(grammar2));
      tree = parser.parse("one two ... three");
      assert.equal(
        tree.rootNode.toString(),
        "(thing (triple (word) (word) (ellipsis) (word)))"
      );

      tree = parser.parse("one two ... three ... four");
      assert.equal(
        tree.rootNode.toString(),
        "(thing (triple (word) (word) (ellipsis) (word)) (ellipsis) (ERROR (word)))"
      );

      let grammar3 = grammar(grammar2, {
        name: "grammar3",
        conflicts: $ => [[$.triple, $.double]],
        rules: {
          thing: ($, original) => choice(original, repeat($.double)),
          double: $ => seq($.word, $.word)
        }
      });

      parser.setLanguage(generateAndLoadLanguage(grammar3));
      tree = parser.parse("one two ... three ... four");
      assert.equal(
        tree.rootNode.toString(),
        "(thing (double (word) (word)) (ellipsis) (double (word) (ellipsis) (word)))"
      );
    });

    it("allows inlines to be added", () => {
      const grammar1 = grammar({
        name: "grammar1",

        inline: $ => [$.something],

        rules: {
          statement: $ => seq($.something, ";"),
          something: $ => $.expression,
          expression: $ => choice($.property, $.call, $.identifier),
          property: $ => seq($.expression, ".", $.identifier),
          call: $ => seq($.expression, "(", $.expression, ")"),
          identifier: $ => /[a-z]+/
        }
      });

      parser.setLanguage(generateAndLoadLanguage(grammar1));
      tree = parser.parse("a.b(c);");
      assert.equal(
        tree.rootNode.toString(),
        "(statement (expression (call (expression (property (expression (identifier)) (identifier))) (expression (identifier)))))"
      );

      const grammar2 = grammar(grammar1, {
        name: "grammar2",

        inline: ($, original) => original.concat([$.expression])
      });

      parser.setLanguage(generateAndLoadLanguage(grammar2));
      tree = parser.parse("a.b(c);");
      assert.equal(
        tree.rootNode.toString(),
        "(statement (call (property (identifier) (identifier)) (identifier)))"
      );
    });
  });

  describe("error handling", () => {
    describe("when the grammar has conflicts", () => {
      it("raises an error describing the conflict", () => {
        let threw = false;

        try {
          generate(
            grammar({
              name: "test_grammar",
              rules: {
                sentence: $ => choice($.first_rule, $.second_rule),
                first_rule: $ => seq("things", "stuff"),
                second_rule: $ => seq("things", "stuff")
              }
            })
          );
        } catch (e) {
          assert.match(e.message, /Unresolved conflict /);
          assert.match(e.message, /first_rule/);
          assert.match(e.message, /second_rule/);
          assert.property(e, "isGrammarError");
          threw = true;
        }

        assert.ok(threw, "Expected an exception!");
      });
    });

    describe("when the grammar has no name", () => {
      it("raises an error", () => {
        assert.throws(
          () =>
            grammar({
              rules: {
                the_rule: $ => blank()
              }
            }),
          /Grammar.*name.*string/
        );

        assert.throws(
          () =>
            grammar({
              name: {},
              rules: {
                the_rule: $ => blank()
              }
            }),
          /Grammar.*name.*string/
        );
      });
    });

    describe("when the grammar has no rules", () => {
      it("raises an error", () => {
        assert.throws(
          () =>
            grammar({
              name: "test_grammar"
            }),
          /Grammar.*must have.*rule/
        );
      });
    });

    describe("when the grammar contains a reference to an undefined rule", () => {
      it("throws an error with the rule name", () => {
        assert.throws(
          () =>
            grammar({
              name: "test_grammar",
              rules: {
                something: $ => seq("(", $.something_else, ")")
              }
            }),
          /Undefined.*rule.*something_else/
        );
      });
    });

    describe("when one of the grammar rules is not a function", () => {
      it("raises an error", () => {
        assert.throws(
          () =>
            grammar({
              name: "test_grammar",
              rules: {
                the_rule: blank()
              }
            }),
          /Grammar.*rule.*function.*the_rule/
        );
      });
    });

    describe("when the grammar's extras value is not a function", () => {
      it("raises an error", () => {
        assert.throws(
          () =>
            grammar({
              extras: [],
              name: "test_grammar",
              rules: {
                the_rule: $ => blank()
              }
            }),
          /Grammar.*extras.*function/
        );
      });
    });

    describe("when one of the grammar's extras tokens is not a token", () => {
      it("raises an error", () => {
        let threw = false;

        try {
          generate(
            grammar({
              name: "test_grammar",
              extras: $ => [$.yyy],
              rules: {
                xxx: $ => seq($.yyy, $.yyy),
                yyy: $ => seq($.zzz, $.zzz),
                zzz: $ => "zzz"
              }
            })
          );
        } catch (e) {
          assert.match(e.message, /Non-token symbol yyy/);
          assert.property(e, "isGrammarError");
          threw = true;
        }

        assert.ok(threw, "Expected an exception!");
      });
    });

    describe("when a symbol references an undefined rule", () => {
      it("raises an error", () => {
        assert.throws(
          () =>
            generate(
              grammar({
                name: "test_grammar",
                rules: {
                  xxx: $ => sym("yyy")
                }
              })
            ),
          /Undefined.*rule.*yyy/
        );
      });
    });
  });
});

function generateAndLoadLanguage(grammar, ...args) {
  var validation = schemaValidator.validate(grammar, GRAMMAR_SCHEMA);
  if (!validation.valid) throw new Error(validation.errors[0]);
  const parserCode = generate(grammar);
  return loadLanguage(parserCode, ...args);
}
