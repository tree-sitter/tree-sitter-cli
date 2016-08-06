module.exports = function parse(options, callback) {
  var fs = require("fs"),
      path = require("path"),
      cwd = process.cwd(),
      language = require(path.join(cwd, "index")),
      Document = require("tree-sitter").Document,
      spawn = require("child_process").spawn,
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
    document.setDebugger(function(topic, params, type) {
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
    var dtraceOutputFile = temp.openSync({prefix: 'dtrace.out'});
    var flamegraphFile = temp.openSync({prefix: 'flamegraph', suffix: '.html'});
    fs.chmodSync(flamegraphFile.path, '755');

    var dtraceProcess = spawn("dtrace", [
      "-x", "ustackframes=100",
      "-n", "profile-2000 /pid == $target/ { @num[ustack()] = count(); }",
      "-c", invokeSelfCommand(options, {profile: false}).join(' ')
    ], {
      stdio: ['ignore', dtraceOutputFile.fd, process.stderr]
    });

    dtraceProcess.on('close', function(code) {
      if (code !== 0) {
        return callback(code);
      }

      fs.closeSync(dtraceOutputFile.fd);
      var dtraceOutput = fs.readFileSync(dtraceOutputFile.path, 'utf8');
      var dtraceStacks = dtraceOutput.split("\n\n");

      var stackvisProcess = spawn(path.join(__dirname, '..', '..', 'node_modules', '.bin', 'stackvis'), [], {
        stdio: ['pipe', flamegraphFile.fd, process.stderr]
      });

      var filteredOutput = dtraceOutput
        .split('\n\n')
        .map(function (stack) {
          var lines = stack.split('\n');
          var matchingLine = lines.findIndex((line) => line.indexOf('ts_document_parse') !== -1);
          if (matchingLine !== -1) {
            return lines.slice(0, matchingLine + 1).join('\n') + '\n' + lines[lines.length - 1]
          } else {
            return null;
          }
        })
        .filter(function (stack) { return !!stack })
        .join('\n\n');

      stackvisProcess.stdin.write(filteredOutput);
      stackvisProcess.stdin.end();

      stackvisProcess.on('close', function(code) {
        if (code !== 0) {
          return callback(code);
        }

        console.log("Opening", flamegraphFile.path);
        spawn('open', [flamegraphFile.path]);
        callback(0);
      });
    });

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

  if (options.print) {
    printNode(document.rootNode, 0);
    process.stdout.write("\n");
  }

  console.log("Parsed in %d milliseconds", (t1 - t0) / options.repeat);

  if (!document.rootNode) {
    console.log("Memory allocation failed");
    callback(1)
  } else if (document.rootNode.toString().indexOf('ERROR') !== -1) {
    console.log("Error detected")
    callback(1);
  } else {
    callback(0);
  }
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

function invokeSelfCommand(options, overrides) {
  return [
    process.argv[0],
    "-e",
    "require('" + __filename + "')(" +
      JSON.stringify(Object.assign(options, overrides)) +
      ",process.exit);"
  ];
}
