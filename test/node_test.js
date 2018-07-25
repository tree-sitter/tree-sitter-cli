const Parser = require("tree-sitter");
const { TextBuffer } = require("superstring");
const { assert } = require("chai");
const ARITHMETIC = require('./fixtures/arithmetic_language');

describe("Node", () => {
  let parser;

  beforeEach(() => {
    parser = new Parser().setLanguage(ARITHMETIC);
  });

  describe(".children", () => {
    it("returns an array of child nodes", () => {
      const tree = parser.parse("x10 + 1000");
      const sumNode = tree.rootNode.firstChild;
      assert.equal(1, tree.rootNode.children.length);
      assert.deepEqual(
        sumNode.children.map(child => child.type),
        ["variable", "+", "number"]
      );
    });
  });

  describe(".namedChildren", () => {
    it("returns an array of named child nodes", () => {
      const tree = parser.parse("x10 + 1000");
      const sumNode = tree.rootNode.firstChild;
      assert.equal(1, tree.rootNode.namedChildren.length);
      assert.deepEqual(
        ["variable", "number"],
        sumNode.namedChildren.map(child => child.type)
      );
    });
  });

  describe(".startIndex and .endIndex", () => {
    it("returns the character index where the node starts/ends in the text", () => {
      const tree = parser.parse("a👍👎1 / b👎c👎");
      const quotientNode = tree.rootNode.firstChild;

      assert.equal(0, quotientNode.startIndex);
      assert.equal(15, quotientNode.endIndex);
      assert.deepEqual(
        [0, 7, 9],
        quotientNode.children.map(child => child.startIndex)
      );
      assert.deepEqual(
        [6, 8, 15],
        quotientNode.children.map(child => child.endIndex)
      );
    });
  });

  describe(".startPosition and .endPosition", () => {
    it("returns the row and column where the node starts/ends in the text", () => {
      const tree = parser.parse("x10 + 1000");
      const sumNode = tree.rootNode.firstChild;
      assert.equal("sum", sumNode.type);

      assert.deepEqual({ row: 0, column: 0 }, sumNode.startPosition);
      assert.deepEqual({ row: 0, column: 10 }, sumNode.endPosition);
      assert.deepEqual(
        [{ row: 0, column: 0 }, { row: 0, column: 4 }, { row: 0, column: 6 }],
        sumNode.children.map(child => child.startPosition)
      );
      assert.deepEqual(
        [{ row: 0, column: 3 }, { row: 0, column: 5 }, { row: 0, column: 10 }],
        sumNode.children.map(child => child.endPosition)
      );
    });

    it("handles characters that occupy two UTF16 code units", () => {
      const tree = parser.parse("a👍👎1 /\n b👎c👎");
      const sumNode = tree.rootNode.firstChild;
      assert.deepEqual(
        [
          [{ row: 0, column: 0 }, { row: 0, column: 6 }],
          [{ row: 0, column: 7 }, { row: 0, column: 8 }],
          [{ row: 1, column: 1 }, { row: 1, column: 7 }]
        ],
        sumNode.children.map(child => [child.startPosition, child.endPosition])
      );
    });
  });

  describe(".parent", () => {
    it("returns the node's parent", () => {
      const tree = parser.parse("x10 + 1000");
      const sumNode = tree.rootNode.firstChild;
      const variableNode = sumNode.firstChild;
      assert.equal(sumNode, variableNode.parent);
      assert.equal(tree.rootNode, sumNode.parent);
    });
  });

  describe(".nextSibling and .previousSibling", () => {
    it("returns the node's next and previous sibling", () => {
      const tree = parser.parse("x10 + 1000");
      const sumNode = tree.rootNode.firstChild;
      assert.equal(sumNode.children[1], sumNode.children[0].nextSibling);
      assert.equal(sumNode.children[2], sumNode.children[1].nextSibling);
      assert.equal(
        sumNode.children[0],
        sumNode.children[1].previousSibling
      );
      assert.equal(
        sumNode.children[1],
        sumNode.children[2].previousSibling
      );
    });
  });

  describe(".nextNamedSibling and .previousNamedSibling", () => {
    it("returns the node's next and previous named sibling", () => {
      const tree = parser.parse("x10 + 1000");
      const sumNode = tree.rootNode.firstChild;
      assert.equal(
        sumNode.namedChildren[1],
        sumNode.namedChildren[0].nextNamedSibling
      );
      assert.equal(
        sumNode.namedChildren[0],
        sumNode.namedChildren[1].previousNamedSibling
      );
    });
  });

  describe(".descendantForIndex(min, max)", () => {
    it("returns the smallest node that spans the given range", () => {
      const tree = parser.parse("x10 + 1000");
      const sumNode = tree.rootNode.firstChild;
      assert.equal("variable", sumNode.descendantForIndex(1, 2).type);
      assert.equal("+", sumNode.descendantForIndex(4, 4).type);

      assert.throws(() => {
        sumNode.descendantForIndex(1, {});
      }, /Character index must be a number/);

      assert.throws(() => {
        sumNode.descendantForIndex();
      }, /Character index must be a number/);
    });
  });

  describe(".namedDescendantForIndex", () => {
    it("returns the smallest node that spans the given range", () => {
      const tree = parser.parse("x10 + 1000");
      const sumNode = tree.rootNode.firstChild;
      assert.equal("variable", sumNode.descendantForIndex(1, 2).type);
      assert.equal("+", sumNode.descendantForIndex(4, 4).type);
    });
  });

  describe(".descendantForPosition(min, max)", () => {
    it("returns the smallest node that spans the given range", () => {
      const tree = parser.parse("x10 + 1000");
      const sumNode = tree.rootNode.firstChild;

      assert.equal(
        "variable",
        sumNode.descendantForPosition(
          { row: 0, column: 1 },
          { row: 0, column: 2 }
        ).type
      );

      assert.equal(
        "+",
        sumNode.descendantForPosition({ row: 0, column: 4 }).type
      );

      assert.throws(() => {
        sumNode.descendantForPosition(1, {});
      }, /Point.row must be a number/);

      assert.throws(() => {
        sumNode.descendantForPosition();
      }, /Point must be a .* object/);
    });
  });

  describe(".namedDescendantForPosition(min, max)", () => {
    it("returns the smallest named node that spans the given range", () => {
      const tree = parser.parse("x10 + 1000");
      const sumNode = tree.rootNode.firstChild;

      assert.equal(
        "variable",
        sumNode.namedDescendantForPosition(
          { row: 0, column: 1 },
          { row: 0, column: 2 }
        ).type
      );

      assert.equal(
        "sum",
        sumNode.namedDescendantForPosition({ row: 0, column: 4 }).type
      );
    });
  });

  describe('.descendantsOfType(type, min, max)', () => {
    it('finds all of the descendants of the given type in the given range', () => {
      const tree = parser.parse("a + 1 * b * 2 + c + 3");
      const outerSum = tree.rootNode.firstChild;
      let descendants = outerSum.descendantsOfType('number', {row: 0, column: 2}, {row: 0, column: 15})
      assert.deepEqual(
        descendants.map(node => node.startIndex),
        [4, 12]
      );

      descendants = outerSum.descendantsOfType('variable', {row: 0, column: 2}, {row: 0, column: 15})
      assert.deepEqual(
        descendants.map(node => node.startIndex),
        [8]
      );

      descendants = outerSum.descendantsOfType('variable', {row: 0, column: 0}, {row: 0, column: 30})
      assert.deepEqual(
        descendants.map(node => node.startIndex),
        [0, 8, 16]
      );

      descendants = outerSum.descendantsOfType('number', {row: 0, column: 0}, {row: 0, column: 30})
      assert.deepEqual(
        descendants.map(node => node.startIndex),
        [4, 12, 20]
      );

      descendants = outerSum.descendantsOfType('number')
      assert.deepEqual(
        descendants.map(node => node.startIndex),
        [4, 12, 20]
      );

      descendants = outerSum.firstChild.descendantsOfType('number', {row: 0, column: 0}, {row: 0, column: 30})
      assert.deepEqual(
        descendants.map(node => node.startIndex),
        [4, 12]
      );
    })
  })

  describe(".firstChildForIndex(index)", () => {
    it("returns the first child that extends beyond the given index", () => {
      const tree = parser.parse("x10 + 1000");
      const sumNode = tree.rootNode.firstChild;

      assert.equal("variable", sumNode.firstChildForIndex(0).type);
      assert.equal("variable", sumNode.firstChildForIndex(1).type);
      assert.equal("+", sumNode.firstChildForIndex(3).type);
      assert.equal("number", sumNode.firstChildForIndex(5).type);
    });
  });

  describe(".firstNamedChildForIndex(index)", () => {
    it("returns the first child that extends beyond the given index", () => {
      const tree = parser.parse("x10 + 1000");
      const sumNode = tree.rootNode.firstChild;

      assert.equal("variable", sumNode.firstNamedChildForIndex(0).type);
      assert.equal("variable", sumNode.firstNamedChildForIndex(1).type);
      assert.equal("number", sumNode.firstNamedChildForIndex(3).type);
    });
  });

  describe(".hasError()", () => {
    it("returns true if the node contains an error", () => {
      const tree = parser.parse("1 + 2 * * 3");
      const node = tree.rootNode;
      assert.equal(
        node.toString(),
        "(program (sum (number) (product (number) (ERROR) (number))))"
      );

      const sum = node.firstChild;
      assert(sum.hasError());
      assert(!sum.children[0].hasError());
      assert(!sum.children[1].hasError());
      assert(sum.children[2].hasError());
    });
  });

  describe(".isMissing()", () => {
    it("returns true if the node is missing from the source and was inserted via error recovery", () => {
      const tree = parser.parse("2 +");
      const node = tree.rootNode;
      assert.equal(node.toString(), "(program (sum (number) (MISSING)))");

      const sum = node.firstChild;
      assert(sum.hasError());
      assert(!sum.children[0].isMissing());
      assert(!sum.children[1].isMissing());
      assert(sum.children[2].isMissing());
    });
  });

  describe(".text", () => {
    Object.entries({
      '.parse(String)': (parser, src) => parser.parse(src),
      '.parse(Function)': (parser, src) =>
        parser.parse(offset => src.substr(offset, 4)),
      '.parseTextBuffer': (parser, src) =>
        parser.parseTextBuffer(new TextBuffer(src)),
      '.parseTextBufferSync': (parser, src) =>
        parser.parseTextBufferSync(new TextBuffer(src))
    }).forEach(([method, parse]) =>
      it(`returns the text of a node generated by ${method}`, async () => {
        const src = "α0 / b👎c👎"
        const [numeratorSrc, denominatorSrc] = src.split(/\s*\/\s+/)
        const tree = await parse(parser, src)
        const quotientNode = tree.rootNode.firstChild;
        const [numerator, slash, denominator] = quotientNode.children;

        assert.equal(src, tree.rootNode.text,          'root node text');
        assert.equal(denominatorSrc, denominator.text, 'denominator text');
        assert.equal(src, quotientNode.text,           'quotient text');
        assert.equal(numeratorSrc, numerator.text,     'numerator text');
        assert.equal('/', slash.text,                  '"/" text');
      })
    )
  })
});
