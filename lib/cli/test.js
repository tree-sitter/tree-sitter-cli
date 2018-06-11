module.exports = function test(options, callback) {
  const fs = require("fs");
  const vows = require("vows");
  const specReporter = require("vows/lib/vows/reporters/spec");
  const path = require("path");
  const assert = require("assert");
  const Parser = require('tree-sitter');

  const cwd = process.cwd();
  const language = require(cwd)
  const parser = new Parser().setLanguage(language);

  let testDir = path.join(cwd, 'corpus');
  if (!fs.existsSync(testDir)) {
    testDir = path.join(cwd, 'grammar_test')
    if (!fs.existsSync(testDir)) {
      console.error("Couldn't find a `corpus` or `grammar_test` directory in the current working directory");
      callback(1)
      return
    }
  }

  if (options.debug)
    parser.setLogger(function(topic, params, type) {
      switch (type) {
        case 'parse':
          console.log(topic, params)
          break;
        case 'lex':
          console.log("  ", topic, params);
      }
    });

  vows
    .describe("The " + language.name + " language")
    .addBatch(suiteForPath(testDir, parser))
    .run(
      {
        reporter: specReporter,
        matcher: options.focus && new RegExp(options.focus),
      },
      (result) => callback(result.broken)
    );

  function suiteForPath(filepath, parser) {
    const result = {};

    if (fs.statSync(filepath).isDirectory()) {
      fs.readdirSync(filepath).forEach(function(name) {
        const description = name.split('.')[0];
        result[description] = suiteForPath(path.join(filepath, name), parser);
      });
    } else {
      let content = fs.readFileSync(filepath, "utf8");

      for (;;) {
        const headerMatch = content.match(/===+\r?\n([^\r\n=]+)\r?\n===+\r?\n/);
        const dividerMatch = content.match(/\n(---+\r?\n)/);

        if (!headerMatch || !dividerMatch) break;

        const testName = headerMatch[1];
        const inputStart = headerMatch[0].length;
        const inputEnd = dividerMatch.index;
        const outputStart = dividerMatch.index + dividerMatch[1].length;
        const nextTestStart = content.slice(outputStart).search(/\n===/);
        const outputEnd = (nextTestStart > 0) ? (nextTestStart + outputStart) : content.length;
        const input = content.slice(inputStart, inputEnd);
        const output = content.slice(outputStart, outputEnd);

        ((input, output) => {
          result[testName] = () => {
            const tree = parser.parse(input);
            assert.equal(normalizeWhitespace(output), tree.rootNode.toString());
          };
        })(input, output);

        content = content.slice(outputEnd + 1);
      }
    }

    return result;
  }

  function normalizeWhitespace(str) {
    return str
      .replace(/\s+/g, " ")
      .replace(/ \)/g, ')')
      .trim()
  }
};
