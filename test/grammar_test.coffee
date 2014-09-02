assert = require "assert"
compiler = require ".."
{ blank, choice, prec, err, repeat, seq } = compiler.rules
{ Document } = require "tree-sitter"

describe "building a grammar", ->
  document = null

  beforeEach ->
    document = new Document()

  describe "rules", ->
    describe "blank", ->
      it "matches the empty string", ->
        grammar = compiler.grammar
          name: "test_grammar"
          rules:
            the_rule: -> blank()

        document.setLanguage(compiler.compileAndLoad(grammar))

        document.setInputString("")
        assert.equal(document.toString(), "(DOCUMENT (the_rule))")
        document.setInputString("not-blank")
        assert.equal(document.toString(), "(DOCUMENT (ERROR 'n'))")

    describe "string", ->
      it "matches one particular string", ->
        grammar = compiler.grammar
          name: "test_grammar"
          rules:
            the_rule: -> "the-string"

        document.setLanguage(compiler.compileAndLoad(grammar))

        document.setInputString("the-string")
        assert.equal(document.toString(), "(DOCUMENT (the_rule))")
        document.setInputString("another-string")
        assert.equal(document.toString(), "(DOCUMENT (ERROR 'a'))")

    describe "regex", ->
      it "matches according to a regular expression", ->
        grammar = compiler.grammar
          name: "test_grammar"
          rules:
            the_rule: -> /[a-c]+/

        document.setLanguage(compiler.compileAndLoad(grammar))

        document.setInputString("abcba")
        assert.equal(document.toString(), "(DOCUMENT (the_rule))")
        document.setInputString("def")
        assert.equal(document.toString(), "(DOCUMENT (ERROR 'd'))")

    describe "repeat", ->
      it "applies the given rule any number of times", ->
        grammar = compiler.grammar
          name: "test_grammar"
          rules:
            the_rule: -> repeat("o")

        document.setLanguage(compiler.compileAndLoad(grammar))

        document.setInputString("")
        assert.equal(document.toString(), "(DOCUMENT (the_rule))")
        document.setInputString("o")
        assert.equal(document.toString(), "(DOCUMENT (the_rule))")
        document.setInputString("ooo")
        assert.equal(document.toString(), "(DOCUMENT (the_rule))")

    describe "sequence", ->
      it "applies a list of other rules in sequence", ->
        grammar = compiler.grammar
          name: "test_grammar"
          rules:
            the_rule: -> seq("1", "2", "3")

        document.setLanguage(compiler.compileAndLoad(grammar))

        document.setInputString("123")
        assert.equal(document.toString(), "(DOCUMENT (the_rule))")
        document.setInputString("12")
        assert.equal(document.toString(), "(DOCUMENT (ERROR <EOF>))")
        document.setInputString("1234")
        assert.equal(document.toString(), "(DOCUMENT (ERROR '4'))")

    describe "choice", ->
      it "applies any of a list of rules", ->
        grammar = compiler.grammar
          name: "test_grammar"
          rules:
            the_rule: -> choice("1", "2", "3")

        document.setLanguage(compiler.compileAndLoad(grammar))

        document.setInputString("1")
        assert.equal(document.toString(), "(DOCUMENT (the_rule))")
        document.setInputString("4")
        assert.equal(document.toString(), "(DOCUMENT (ERROR '4'))")

    describe "symbol", ->
      it "applies another rule in the grammar by name", ->
        grammar = compiler.grammar
          name: "test_grammar"
          rules:
            the_rule: -> seq(@second_rule, "-", @third_rule)
            second_rule: -> "one"
            third_rule: -> "two"

        document.setLanguage(compiler.compileAndLoad(grammar))

        document.setInputString("one-two")
        assert.equal(document.toString(), "(DOCUMENT (the_rule (second_rule) (third_rule)))")

    describe "prec", ->
      it "alters the precedence of the given rule", ->
        grammar = compiler.grammar
          name: "test_grammar"
          rules:
            expression: -> choice(@sum, @product, @equation, @number)
            sum: -> seq(@expression, "+", @expression)
            product: -> prec(1, seq(@expression, "*", @expression))
            equation: -> prec(-1, seq(@expression, "=", @expression))
            number: -> /\d+/

        document.setLanguage(compiler.compileAndLoad(grammar))

        document.setInputString("1+2*3")
        assert.equal(document.toString(), "(DOCUMENT (sum (number) (product (number) (number))))")
        document.setInputString("1*2+3")
        assert.equal(document.toString(), "(DOCUMENT (sum (product (number) (number)) (number)))")
        document.setInputString("3=2+1")
        assert.equal(document.toString(), "(DOCUMENT (equation (number) (sum (number) (number))))")
        document.setInputString("1+2=3")
        assert.equal(document.toString(), "(DOCUMENT (equation (sum (number) (number)) (number)))")

    describe "err", ->
      it "confines errors to the given subtree", ->
        grammar = compiler.grammar
          name: "test_grammar"
          rules:
            the_rule: -> seq(@rule1, err(@rule2), @rule3, @rule4)
            rule1: -> "aa"
            rule2: -> "bb"
            rule3: -> "cc"
            rule4: -> "dd"
            _space: -> " "

        document.setLanguage(compiler.compileAndLoad(grammar))

        document.setInputString("aa**ccdd")
        assert.equal(
          document.toString(),
          "(DOCUMENT (the_rule (rule1) (ERROR '*') (rule3) (rule4)))")
        document.setInputString("aabb**dd")
        assert.equal(
          document.toString(),
          "(DOCUMENT (rule1) (rule2) (ERROR '*'))")

  describe "ubiquitous tokens", ->
    it "allows the given tokens to appear anywhere in the input", ->
      grammar = compiler.grammar
        name: "test_grammar"
        ubiquitous: ["ellipsis", "_space"]
        rules:
          the_rule: -> repeat(@word)
          word: -> /\w+/
          ellipsis: -> "..."
          _space: -> /\s+/

      document.setLanguage(compiler.compileAndLoad(grammar))

      document.setInputString("one two ... three ... four")
      assert.equal(
        document.toString(),
        "(DOCUMENT (the_rule (word) (word) (ellipsis) (word) (ellipsis) (word)))")

  describe "error handling", ->
    describe "when the grammar has no name", ->
      it "raises an error", ->
        assert.throws((->
          compiler.grammar
            rules:
              the_rule: -> blank()
        ), /grammar.*name.*string/)

        assert.throws((->
          compiler.grammar
            name: {}
            rules:
              the_rule: -> blank()
        ), /grammar.*name.*string/)

    describe "when the grammar has no rules", ->
      it "raises an error", ->
        assert.throws((->
          compiler.grammar
            name: "test_grammar"
        ), /grammar.*rules.*object/)
