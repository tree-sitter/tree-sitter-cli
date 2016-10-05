'use strict';

const assert = require("assert");
const Document = require("tree-sitter").Document
const compiler = require("..");
const grammar = compiler.dsl.grammar;
const seq = compiler.dsl.seq;
const choice = compiler.dsl.choice;
const prec = compiler.dsl.prec;
const repeat = compiler.dsl.repeat;
const token = compiler.dsl.token;

describe("ASTNode", () => {
  let document, language, rootNode, sumNode;

  before(() => {
    language = compiler.loadLanguage(compiler.compile(grammar({
      name: "arithmetic",

      rules: {
        program: $ => $._expression,

        _expression: $ => choice(
          $.sum,
          $.difference,
          $.product,
          $.quotient,
          $.number,
          $.variable
        ),

        sum: $ => prec.left(0, seq(
          $._expression, "+", $._expression
        )),

        difference: $ => prec.left(0, seq(
          $._expression, "-", $._expression
        )),

        product: $ => prec.left(1, seq(
          $._expression, "*", $._expression
        )),

        quotient: $ => prec.left(1, seq(
          $._expression, "/", $._expression
        )),

        number: $ => (/\d+/),

        variable: $ => token(seq(
          /\a/,
          repeat(choice(/\w/, "👍", "👎"))
        )),
      }
    })));
  });

  beforeEach(() => {
    document = new Document()
      .setLanguage(language)
      .setInputString("x10 + 1000")
      .parse();
    sumNode = document.rootNode.children[0];
    assert.equal("sum", sumNode.type);
  });

  describe("::children", () => {
    it("returns an array of child nodes", () => {
      assert.equal(1, document.rootNode.children.length)
      assert.deepEqual(
        ['variable', '+', 'number'],
        sumNode.children.map(child => child.type)
      )
    });
  });

  describe("::namedChildren", () => {
    it("returns an array of named child nodes", () => {
      assert.equal(1, document.rootNode.namedChildren.length)
      assert.deepEqual(
        ['variable', 'number'],
        sumNode.namedChildren.map(child => child.type)
      )
    });
  });

  describe("::startIndex and ::endIndex", () => {
    it("returns the character index where the node starts/ends in the text", () => {
      var inputString = "a👍👎1 / b👎c👎";
      document.setInputString(inputString).parse()
      sumNode = document.rootNode.children[0];

      assert.equal(0, sumNode.startIndex)
      assert.equal(15, sumNode.endIndex)
      assert.deepEqual([0, 7, 9], sumNode.children.map(child => child.startIndex))
      assert.deepEqual([6, 8, 15], sumNode.children.map(child => child.endIndex))
    });
  });

  describe("::startPosition and ::endPosition", () => {
    it("returns the row and column where the node starts/ends in the text", () => {
      assert.deepEqual({row: 0, column: 0}, sumNode.startPosition)
      assert.deepEqual({row: 0, column: 10}, sumNode.endPosition)
      assert.deepEqual([
        {row: 0, column: 0},
        {row: 0, column: 4},
        {row: 0, column: 6}
      ], sumNode.children.map(child => child.startPosition))
      assert.deepEqual([
        {row: 0, column: 3},
        {row: 0, column: 5},
        {row: 0, column: 10}
      ], sumNode.children.map(child => child.endPosition))
    });
  });

  describe("::parent", () => {
    it("returns the node's parent", () => {
      let variableNode = sumNode.children[0]
      assert.deepEqual(sumNode, variableNode.parent)
      assert.deepEqual(document.rootNode, sumNode.parent)
    });
  });

  describe("::nextSibling and ::previousSibling", () => {
    it("returns the node's next and previous sibling", () => {
      assert.deepEqual(sumNode.children[1], sumNode.children[0].nextSibling)
      assert.deepEqual(sumNode.children[2], sumNode.children[1].nextSibling)
      assert.deepEqual(sumNode.children[0], sumNode.children[1].previousSibling)
      assert.deepEqual(sumNode.children[1], sumNode.children[2].previousSibling)
    });
  });

  describe("::nextNamedSibling and ::previousNamedSibling", () => {
    it("returns the node's next and previous named sibling", () => {
      assert.deepEqual(sumNode.namedChildren[1], sumNode.namedChildren[0].nextNamedSibling)
      assert.deepEqual(sumNode.namedChildren[0], sumNode.namedChildren[1].previousNamedSibling)
    });
  });

  describe("::descendantForIndex(min, max)", () => {
    it("returns the smallest node that spans the given range", () => {
      assert.equal('variable', sumNode.descendantForIndex(1, 2).type)
      assert.equal('+', sumNode.descendantForIndex(4, 4).type)

      assert.throws(() => {
        sumNode.descendantForIndex(1, {})
      }, /Character index must be a number/)

      assert.throws(() => {
        sumNode.descendantForIndex()
      }, /Must provide 1 or 2 character indices/)
    });
  });

  describe("::namedDescendantForIndex", function () {
    it("returns the smallest node that spans the given range", function () {
      assert.equal('variable', sumNode.descendantForIndex(1, 2).type)
      assert.equal('+', sumNode.descendantForIndex(4, 4).type)
    });
  });

  describe("::descendantForPosition(min, max)", () => {
    it("returns the smallest node that spans the given range", () => {
      assert.equal(
        'variable',
        sumNode.descendantForPosition(
          {row: 0, column: 1},
          {row: 0, column: 2}
        ).type
      );

      assert.equal(
        '+',
        sumNode.descendantForPosition(
          {row: 0, column: 4}
        ).type
      );

      assert.throws(() => {
        sumNode.descendantForPosition(1, {})
      }, /Point.row must be a number/)

      assert.throws(() => {
        sumNode.descendantForPosition()
      }, /Must provide 1 or 2 points/)
    });
  });

  describe("::namedDescendantForPosition(min, max)", () => {
    it("returns the smalleset named node that spans the given range", () => {
      assert.equal(
        'variable',
        sumNode.namedDescendantForPosition(
          {row: 0, column: 1},
          {row: 0, column: 2}
        ).type
      )

      assert.equal(
        'sum',
        sumNode.namedDescendantForPosition(
          {row: 0, column: 4}
        ).type
      )
    });
  });
});
