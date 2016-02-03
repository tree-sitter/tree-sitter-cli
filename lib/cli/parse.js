module.exports = function test(options, callback) {
  var fs = require("fs"),
      path = require("path"),
      cwd = process.cwd(),
      language = require(path.join(cwd, "index")),
      Document = require("tree-sitter").Document;

  var document = new Document().setLanguage(language);

  if (options.debug)
    document.setDebugger(function(topic, params, type) {
      switch (type) {
        case 'parse':
          console.log(topic, params)
          break;
        case 'lex':
          console.log("  ", topic, params);
      }
    });

  document.setInputString(fs.readFileSync(options.codePath, 'utf8'));

  var t0 = Date.now()
  document.parse();
  var t1 = Date.now();

  if (options.print) {
    printNode(document.rootNode, 0);
    process.stdout.write("\n");
  } else if (document.rootNode.toString().indexOf('ERROR') !== -1) {
    console.log("Error detected")
    process.exit(1)
  }

  console.log("Finished in %d milliseconds", t1 - t0);
};

function printNode (node, indentLevel) {
  process.stdout.write(new Array(2 * indentLevel + 1).join(' '));
  process.stdout.write("(");
  process.stdout.write(node.type);
  process.stdout.write(" ");
  process.stdout.write(pointString(node.startPosition));
  process.stdout.write(" - ");
  process.stdout.write(pointString(node.endPosition));

  var children = node.namedChildren;
  for (var i = 0, length = children.length; i < length; i++) {
    process.stdout.write("\n");
    printNode(children[i], indentLevel + 1);
  }

  process.stdout.write(")");
}

function pointString(point) {
  return "[" + point.row + ", " + point.column + "]";
}
