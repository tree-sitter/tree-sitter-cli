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

        document.setInputString("1 + 2 * 3")
        assert.equal(document.toString(), "(DOCUMENT (sum (number) (product (number) (number))))")
        document.setInputString("1 * 2 + 3")
        assert.equal(document.toString(), "(DOCUMENT (sum (product (number) (number)) (number)))")
        document.setInputString("3 = 2 + 1")
        assert.equal(document.toString(), "(DOCUMENT (equation (number) (sum (number) (number))))")
        document.setInputString("1 + 2 = 3")
        assert.equal(document.toString(), "(DOCUMENT (equation (sum (number) (number)) (number)))")

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

        document.setInputString("string1 SOMETHING_ELSE string3 string4")
        assert.equal(
          document.toString(),
          "(DOCUMENT (the_rule (rule1) (ERROR 'S') (rule3) (rule4)))")
        document.setInputString("string1 string2 SOMETHING_ELSE string4")
        assert.equal(
          document.toString(),
          "(DOCUMENT (rule1) (rule2) (ERROR 'S'))")

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

      document.setInputString("one two ... three ... four")
      assert.equal(
        document.toString(),
        "(DOCUMENT (the_rule (word) (word) (ellipsis) (word) (ellipsis) (word)))")

    it "allows anonymous rules to be provided", ->
      grammar = compiler.grammar
        name: "test_grammar"
        ubiquitous: -> ["...", "---"]
        rules:
          the_rule: -> repeat(@word)
          word: -> "hello"

      document.setLanguage(compiler.compileAndLoad(grammar))

      document.setInputString("hello...hello---hello")
      assert.equal(document.toString(), "(DOCUMENT (the_rule (word) (word) (word)))")
      document.setInputString("hello hello")
      assert.equal(document.toString(), "(DOCUMENT (word) (ERROR ' '))")

    it "defaults to whitespace characters", ->
      grammar = compiler.grammar
        name: "test_grammar"
        rules:
          the_rule: -> repeat(@word)
          word: -> "hello"

      document.setLanguage(compiler.compileAndLoad(grammar))

      document.setInputString("hello hello\thello\nhello\rhello")
      assert.equal(document.toString(), "(DOCUMENT (the_rule (word) (word) (word) (word) (word)))")
      document.setInputString("hello.hello")
      assert.equal(document.toString(), "(DOCUMENT (word) (ERROR '.'))")

  describe "error handling", ->
    describe "when the grammar has conflicts", ->
      it "raises an error describing the conflict", ->
        assert.throws((->
          compiler.compile(compiler.grammar
            name: "test_grammar"
            rules:
              sentence: -> choice(@first_rule, @second_rule)
              first_rule: -> seq("things", "stuff")
              second_rule: -> seq("things", "stuff"))
        ), /END_OF_INPUT: .*reduce .* reduce/)

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
        assert.throws((->
          res = compiler.compile compiler.grammar
            name: "test_grammar"
            ubiquitous: -> [@yyy]
            rules:
              xxx: -> seq(@yyy, @yyy)
              yyy: -> seq(@zzz, @zzz)
              zzz: -> "zzz"
          console.log "RES", res
        ), /Not a token.*yyy/)

    describe "when a symbol references an undefined rule", ->
      it "raises an error", ->
        assert.throws((->
          res = compiler.compile compiler.grammar
            name: "test_grammar"
            rules:
              xxx: -> sym("yyy")
          console.log "RES", res
        ), /Undefined.*rule.*yyy/)
