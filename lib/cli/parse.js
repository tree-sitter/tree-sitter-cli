module.exports = function parse(options, callback) {
  var fs = require("fs"),
      path = require("path"),
      cwd = process.cwd(),
      language = require(path.join(cwd, "index")),
      Document = require("tree-sitter").Document,
      spawn = require("child_process").spawn,
      profileCommand = require('./helpers/profile-command'),
      temp = require("temp");

  var document = new Document().setLanguage(language);

  if (options.repeat) {
    console.log("Benchmarking with %d repetitions", options.repeat);
  } else {
    options.repeat = 1;
  }

  if (options.debugGraph) {
    var dotOutputFile = temp.openSync({prefix: 'stack-debug', suffix: '.dot'});
    var htmlOutputFile = temp.openSync({prefix: 'stack-debug', suffix: '.html'});

    var command = invokeSelfCommand(options, {
      debugGraph: false,
      isDebuggingGraph: true
    });
    var parseProcess = spawn(command[0], command.slice(1), {
      stdio: ['ignore', 'ignore', dotOutputFile.fd]
    });

    parseProcess.on('close', function (code) {
      console.log("Wrote ", dotOutputFile.path)

      fs.writeSync(htmlOutputFile.fd, [
        "<!DOCTYPE html>",
        "<style>svg { width: 100%; margin-bottom: 20px; }</style>"
      ].join('\n'));

      var dotProcess = spawn("dot", [
        "-Tsvg",
        dotOutputFile.path
      ], {
        stdio: ['ignore', htmlOutputFile.fd, process.stderr]
      });

      dotProcess.on('close', function (code) {
        if (code !== 0) {
          console.log("dot failed", code);
          return;
        }

        console.log('Opening', htmlOutputFile.path);
        spawn("open", [htmlOutputFile.path]);
      });
    });

    return
  } else if (options.isDebuggingGraph) {
    document._printDebuggingGraphs(true);
    console.log = function() {}
  } else if (options.debug) {
    document.setLogger(function(topic, params, type) {
      switch (type) {
        case 'parse':
          console.log(topic, params)
          break;
        case 'lex':
          console.log("  ", topic, params);
      }
    });
  }

  if (options.profile) {
    profileCommand(invokeSelfCommand(options, {profile: false}).join(' '), 'ts_document_parse', callback)
    return
  }

  document.setInputString(fs.readFileSync(options.codePath, 'utf8'));

  // If running more than once, force JS code to be optimized ahead-of-time, so
  // that the optimization time is not counted.
  if (options.repeat > 1) {
    for (var i = 0; i < 10; i++) {
      document.invalidate().parse();
    }
  }

  var t0 = Date.now()
  for (var i = 0; i < options.repeat; i++) {
    document.invalidate().parse();
  }
  var t1 = Date.now();

  if (!options.quiet && !options.debug && !options.debugGraph) {
    printNode(document.rootNode, 0);
    process.stdout.write("\n");
  }

  if (!options.quiet) {
    console.log("Parsed in %d milliseconds", (t1 - t0) / options.repeat);
  }

  if (!document.rootNode) {
    console.log("Memory allocation failed");
    callback(1)
  } else if (document.rootNode.toString().indexOf('ERROR') !== -1) {
    printFirstErrorNode(document.rootNode, options.codePath);
    callback(1);
  } else {
    callback(0);
  }
};

function printFirstErrorNode(node, path) {
  if (node.type === 'ERROR') {
    errorString = "Error parsing ";
    errorString += path;
    errorString += " (";
    errorString += node.type
    errorString += " ";
    errorString += pointString(node.startPosition);
    errorString += " - ";
    errorString += pointString(node.endPosition);
    errorString += ")";
    console.log(errorString);
    return true;
  }

  var children = node.namedChildren;
  for (var i = 0, length = children.length; i < length; i++) {
    if(printFirstErrorNode(children[i], path)) return true;
  }
}

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

function invokeSelfCommand(options, overrides) {
  return [
    process.argv[0],
    "-e",
    "require('" + __filename + "')(" +
      JSON.stringify(Object.assign(options, overrides)) +
      ",process.exit);"
  ];
}
