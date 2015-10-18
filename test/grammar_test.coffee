{ assert } = require "chai"
compiler = require ".."
{ blank, choice, prec, err, repeat, seq, sym } = compiler.rules
{ Document } = require "tree-sitter"

describe "Writing a grammar", ->
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

        document.setInputString("").parse()
        assert.equal(document.rootNode.toString(), "(the_rule)")

        document.setInputString("not-blank").parse()
        assert.equal(document.rootNode.toString(), "(ERROR (UNEXPECTED 'n'))")

    describe "string", ->
      it "matches one particular string", ->
        grammar = compiler.grammar
          name: "test_grammar"
          rules:
            the_rule: -> "the-string"

        document.setLanguage(compiler.compileAndLoad(grammar))

        document.setInputString("the-string").parse()
        assert.equal(document.rootNode.toString(), "(the_rule)")

        document.setInputString("another-string").parse()
        assert.equal(document.rootNode.toString(), "(ERROR (UNEXPECTED 'a'))")

    describe "regex", ->
      it "matches according to a regular expression", ->
        grammar = compiler.grammar
          name: "test_grammar"
          rules:
            the_rule: -> /[a-c]+/

        document.setLanguage(compiler.compileAndLoad(grammar))

        document.setInputString("abcba").parse()
        assert.equal(document.rootNode.toString(), "(the_rule)")

        document.setInputString("def").parse()
        assert.equal(document.rootNode.toString(), "(ERROR (UNEXPECTED 'd'))")

    describe "repeat", ->
      it "applies the given rule any number of times", ->
        grammar = compiler.grammar
          name: "test_grammar"
          rules:
            the_rule: -> repeat("o")

        document.setLanguage(compiler.compileAndLoad(grammar))

        document.setInputString("").parse()
        assert.equal(document.rootNode.toString(), "(the_rule)")

        document.setInputString("o").parse()
        assert.equal(document.rootNode.toString(), "(the_rule)")

        document.setInputString("ooo").parse()
        assert.equal(document.rootNode.toString(), "(the_rule)")

    describe "sequence", ->
      it "applies a list of other rules in sequence", ->
        grammar = compiler.grammar
          name: "test_grammar"
          rules:
            the_rule: -> seq("1", "2", "3")

        document.setLanguage(compiler.compileAndLoad(grammar))

        document.setInputString("123").parse()
        assert.equal(document.rootNode.toString(), "(the_rule)")

        document.setInputString("12").parse()
        assert.equal(document.rootNode.toString(), "(ERROR (UNEXPECTED <EOF>))")

        document.setInputString("1234").parse()
        assert.equal(document.rootNode.toString(), "(ERROR (UNEXPECTED '4'))")

    describe "choice", ->
      it "applies any of a list of rules", ->
        grammar = compiler.grammar
          name: "test_grammar"
          rules:
            the_rule: -> choice("1", "2", "3")

        document.setLanguage(compiler.compileAndLoad(grammar))

        document.setInputString("1").parse()
        assert.equal(document.rootNode.toString(), "(the_rule)")

        document.setInputString("4").parse()
        assert.equal(document.rootNode.toString(), "(ERROR (UNEXPECTED '4'))")

    describe "symbol", ->
      it "applies another rule in the grammar by name", ->
        grammar = compiler.grammar
          name: "test_grammar"
          rules:
            the_rule: -> seq(@second_rule, "-", @third_rule)
            second_rule: -> "one"
            third_rule: -> "two"

        document.setLanguage(compiler.compileAndLoad(grammar))

        document.setInputString("one-two").parse()
        assert.equal(document.rootNode.toString(), "(the_rule (second_rule) (third_rule))")

    describe "prec", ->
      it "alters the precedence and associativity of the given rule", ->
        grammar = compiler.grammar
          name: "test_grammar"
          rules:
            _expression: -> choice(@sum, @product, @equation, @variable)
            product: -> prec.left(2, seq(@_expression, "*", @_expression))
            sum: -> prec.left(1, seq(@_expression, "+", @_expression))
            equation: -> prec.right(0, seq(@_expression, "=", @_expression))
            variable: -> /\a+/

        document.setLanguage(compiler.compileAndLoad(grammar))

        # product has higher precedence than sum
        document.setInputString("a + b * c").parse()
        assert.equal(document.rootNode.toString(), "(sum (variable) (product (variable) (variable)))")
        document.setInputString("a * b + c").parse()
        assert.equal(document.rootNode.toString(), "(sum (product (variable) (variable)) (variable))")

        # product and sum are left-associative
        document.setInputString("a * b * c").parse()
        assert.equal(document.rootNode.toString(), "(product (product (variable) (variable)) (variable))")
        document.setInputString("a + b + c").parse()
        assert.equal(document.rootNode.toString(), "(sum (sum (variable) (variable)) (variable))")

        # equation is right-associative
        document.setInputString("a = b = c").parse()
        assert.equal(document.rootNode.toString(), "(equation (variable) (equation (variable) (variable)))")

    describe "err", ->
      it "confines errors to the given subtree", ->
        grammar = compiler.grammar
          name: "test_grammar"
          rules:
            the_rule: -> seq(@rule1, err(@rule2), @rule3, @rule4)
            rule1: -> "string1"
            rule2: -> "string2"
            rule3: -> "string3"
            rule4: -> "string4"

        document.setLanguage(compiler.compileAndLoad(grammar))

        document.setInputString("string1 SOMETHING_ELSE string3 string4").parse()
        assert.equal(
          document.rootNode.toString(),
          "(the_rule (rule1) (ERROR (UNEXPECTED 'S')) (rule3) (rule4))")
        document.setInputString("string1 string2 SOMETHING_ELSE string4").parse()
        assert.equal(
          document.rootNode.toString(),
          "(ERROR (rule1) (rule2) (UNEXPECTED 'S') (rule4))")

  describe "ubiquitous tokens", ->
    it "allows the given tokens to appear anywhere in the input", ->
      grammar = compiler.grammar
        name: "test_grammar"
        ubiquitous: -> [@ellipsis, " "]
        rules:
          the_rule: -> repeat(@word)
          word: -> /\w+/
          ellipsis: -> "..."

      document.setLanguage(compiler.compileAndLoad(grammar))

      document.setInputString("one two ... three ... four").parse()
      assert.equal(
        document.rootNode.toString(),
        "(the_rule (word) (word) (ellipsis) (word) (ellipsis) (word))")

    it "allows anonymous rules to be provided", ->
      grammar = compiler.grammar
        name: "test_grammar"
        ubiquitous: -> ["...", "---"]
        rules:
          the_rule: -> repeat(@word)
          word: -> "hello"

      document.setLanguage(compiler.compileAndLoad(grammar))

      document.setInputString("hello...hello---hello").parse()
      assert.equal(document.rootNode.toString(), "(the_rule (word) (word) (word))")

      document.setInputString("hello hello").parse()
      assert.equal(document.rootNode.toString(), "(ERROR (word) (UNEXPECTED ' ') (word))")

    it "defaults to whitespace characters", ->
      grammar = compiler.grammar
        name: "test_grammar"
        rules:
          the_rule: -> repeat(@word)
          word: -> "hello"

      document.setLanguage(compiler.compileAndLoad(grammar))

      document.setInputString("hello hello\thello\nhello\rhello").parse()
      assert.equal(document.rootNode.toString(), "(the_rule (word) (word) (word) (word) (word))")

      document.setInputString("hello.hello").parse()
      assert.equal(document.rootNode.toString(), "(ERROR (word) (UNEXPECTED '.') (word))")

  describe "error handling", ->
    describe "when the grammar has conflicts", ->
      it "raises an error describing the conflict", ->
        try
          compiler.compile compiler.grammar
            name: "test_grammar"
            rules:
              sentence: -> choice(@first_rule, @second_rule)
              first_rule: -> seq("things", "stuff")
              second_rule: -> seq("things", "stuff")
        catch e
          assert.match(e.message, /Unresolved conflict/)
          assert.match(e.message, /Lookahead symbol: END_OF_INPUT/)
          assert.match(e.message, /first_rule -> 'things' 'stuff'/)
          assert.match(e.message, /second_rule -> 'things' 'stuff'/)
          assert.property(e, "isGrammarError")
          threw = true
        assert.ok(threw, "Expected an exception!")

    describe "when the grammar has no name", ->
      it "raises an error", ->
        assert.throws((->
          compiler.grammar
            rules:
              the_rule: -> blank()
        ), /Grammar.*name.*string/)

        assert.throws((->
          compiler.grammar
            name: {}
            rules:
              the_rule: -> blank()
        ), /Grammar.*name.*string/)

    describe "when the grammar has no rules", ->
      it "raises an error", ->
        assert.throws((->
          compiler.grammar
            name: "test_grammar"
        ), /Grammar.*rules.*object/)

    describe "when the grammar contains a reference to an undefined rule", ->
      it "throws an error with the rule name", ->
        assert.throws((->
          compiler.grammar
            name: "test_grammar"
            rules:
              something: -> seq("(", @something_else, ")")

        ), /Undefined.*rule.*something_else/)

    describe "when one of the grammar rules is not a function", ->
      it "raises an error", ->
        assert.throws((->
          compiler.grammar
            name: "test_grammar"
            rules:
              the_rule: blank()
        ), /Grammar.*rule.*function.*the_rule/)

    describe "when the grammar's ubiquitous value is not a function", ->
      it "raises an error", ->
        assert.throws((->
          compiler.grammar
            ubiquitous: []
            name: "test_grammar"
            rules:
              the_rule: -> blank()
        ), /Grammar.*ubiquitous.*function/)

    describe "when one of the grammar's ubiquitous tokens is not a token", ->
      it "raises an error", ->
        try
          compiler.compile compiler.grammar
            name: "test_grammar"
            ubiquitous: -> [@yyy]
            rules:
              xxx: -> seq(@yyy, @yyy)
              yyy: -> seq(@zzz, @zzz)
              zzz: -> "zzz"
        catch e
          assert.match(e.message, /Not a token.*yyy/)
          assert.property(e, "isGrammarError")
          threw = true
        assert.ok(threw, "Expected an exception!")

    describe "when a symbol references an undefined rule", ->
      it "raises an error", ->
        assert.throws((->
          compiler.compile compiler.grammar
            name: "test_grammar"
            rules:
              xxx: -> sym("yyy")
        ), /Undefined.*rule.*yyy/)
