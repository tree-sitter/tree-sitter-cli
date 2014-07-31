var fs = require("fs"),
    vows = require("vows"),
    path = require("path"),
    assert = require("assert"),
    cwd = process.cwd();

require("segfault-handler").registerHandler()

module.exports = function test(callback) {
  var language = require(path.join(cwd, "index")),
      treeSitter = require("tree-sitter"),
      assert = require("assert"),
      batch = {};

  var testDir = path.join(cwd, "grammar_test"),
      batch = suiteForPath(testDir);

  vows.describe(language.name + " parser")
    .addBatch(batch)
    .run({}, function(result) {
      console.log();
      callback(result.broken);
    });

  function suiteForPath(filepath) {
    var stat = fs.statSync(filepath),
        result = {};
    if (stat.isDirectory()) {
      fs.readdirSync(filepath).forEach(function(name) {
        var description = name.split('.')[0];
        result[description] = suiteForPath(path.join(filepath, name));
      });
    } else {
      var content = fs.readFileSync(filepath, "utf8");

      while (true) {
        var sectionHeaderMatch = content.match(/===+\n([\w-\s]+)\n===+/);
        if (!sectionHeaderMatch)
          break;

        var sectionName = sectionHeaderMatch[1],
            headerLength = sectionHeaderMatch[0].length;

        content = content.slice(headerLength);
        var dividerMatch = content.match(/\n(---+)/);
        if (!dividerMatch)
          break;

        var inputEnd = dividerMatch.index,
            outputStart = inputEnd + dividerMatch[1].length + 1,
            end = content.search(/\n===/);

        (function() {
          var input = content.slice(0, inputEnd),
              output = content.slice(outputStart, end).replace(/\s+/g, " ").trim();

          result[sectionName] = function() {
            var document = new treeSitter.Document();
            document.setLanguage(language);
            document.setInputString(input);
            assert.equal(output, document.rootNode().toString());
          };
        })();

        content = content.slice(end + 1);
      }
    }

    return result;
  }
};

