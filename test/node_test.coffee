assert = require "assert"
compiler = require ".."
{ seq, choice } = compiler.rules
{ Document } = require "tree-sitter"

describe "ASTNode", ->
  [document, language] = []

  before ->
    language = compiler.compileAndLoad(compiler.grammar
      name: "arithmetic"

      rules:
        expression: -> choice(@sum, @difference, @product, @quotient, @number, @variable)
        sum: -> seq(@expression, "+", @expression)
        difference: -> seq(@expression, "-", @expression)
        product: -> seq(@expression, "*", @expression)
        quotient: -> seq(@expression, "/", @expression)
        number: -> /\d+/
        variable: -> /\a\w+/
    )

  beforeEach ->
    document = new Document()
    document
      .setLanguage(language)
      .setInputString("x10 + 1000")

  describe "::children", ->
    it "returns an array of child nodes", ->
      assert.equal(1, document.children.length)

      sum = document.children[0]
      assert.equal("sum", sum.name)
      assert.equal(2, sum.children.length)

      variable = sum.children[0]
      assert.equal("variable", variable.name)

      number = sum.children[1]
      assert.equal("number", number.name)

  describe "::size", ->
    it "returns the number of bytes spanned by the node", ->
      sum = document.children[0]
      assert.equal(10, sum.size)
      assert.equal(3, sum.children[0].size)
      assert.equal(4, sum.children[1].size)

  describe "::position", ->
    it "returns the number of bytes spanned by the node", ->
      sum = document.children[0]
      assert.equal(0, sum.position)
      assert.equal(0, sum.children[0].position)
      assert.equal(6, sum.children[1].position)

  describe "::parent()", ->
    it "returns the node's parent", ->
      sum = document.children[0]
      variable = sum.children[0]
      assert.deepEqual(sum, variable.parent())

  describe "::next()", ->
    it "returns the node's next sibling", ->
      sum = document.children[0]
      assert.deepEqual(sum.children[1], sum.children[0].next())

  describe "::prev()", ->
    it "returns the node's previous sibling", ->
      sum = document.children[0]
      assert.deepEqual(sum.children[0], sum.children[1].prev())

  describe "::node_at(position)", ->
    describe "when there is a leaf node that spans the given range", ->
      it "returns the leaf node", ->
        sum = document.children[0]
        variable = sum.nodeAt(1)
        assert.equal('(variable)', variable.toString())
