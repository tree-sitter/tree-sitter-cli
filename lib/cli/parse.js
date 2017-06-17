module.exports = function parse(options, callback) {
  const fs = require("fs");
  const path = require("path");
  const {spawn} = require("child_process");
  const temp = require("temp");
  const {Document} = require("tree-sitter");
  const profileCommand = require('./helpers/profile-command');

  const cwd = process.cwd();
  const language = require(cwd);
  const document = new Document().setLanguage(language);

  if (options.repeat) {
    console.log("Benchmarking with %d repetitions", options.repeat);
  } else {
    options.repeat = 1;
  }

  if (options.debugGraph) {
    const dotOutputFile = temp.openSync({prefix: 'stack-debug', suffix: '.dot'});
    const htmlOutputFile = temp.openSync({prefix: 'stack-debug', suffix: '.html'});

    const command = invokeSelfCommand(options, {
      debugGraph: false,
      isDebuggingGraph: true
    });
    const parseProcess = spawn(command[0], command.slice(1), {
      stdio: ['ignore', 'ignore', dotOutputFile.fd]
    });

    parseProcess.on('close', function (code) {
      console.log("Wrote ", dotOutputFile.path)

      fs.writeSync(htmlOutputFile.fd, [
        "<!DOCTYPE html>",
        "<style>svg { width: 100%; margin-bottom: 20px; }</style>"
      ].join('\n'));

      const dotProcess = spawn("dot", [
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

  const t0 = Date.now()
  for (var i = 0; i < options.repeat; i++) {
    document.invalidate().parse();
  }
  const t1 = Date.now();

  if (!options.quiet && !options.debug && !options.debugGraph) {
    printNode(document.rootNode, 0);
    process.stdout.write("\n");
  }

  if (!options.quiet) {
    console.log("Parsed in %d milliseconds", (t1 - t0) / options.repeat);
  }

  if (document.rootNode.toString().indexOf('ERROR') !== -1) {
    printFirstErrorNode(document.rootNode, options.codePath);
    callback(1);
  } else {
    callback(0);
  }
};

function printFirstErrorNode(node, path) {
  if (node.type === 'ERROR') {
    console.error(
      "Error parsing " + path + " (ERROR " +
      pointString(node.startPosition) + " - " + pointString(node.endPosition) + ")"
    );
    return true;
  }

  const children = node.namedChildren;
  for (let i = 0, length = children.length; i < length; i++) {
    if (printFirstErrorNode(children[i], path)) return true;
  }
}

function printNode(node, indentLevel) {
  process.stdout.write(new Array(2 * indentLevel + 1).join(' '));
  process.stdout.write("(");
  process.stdout.write(node.type);
  process.stdout.write(" ");
  process.stdout.write(pointString(node.startPosition));
  process.stdout.write(" - ");
  process.stdout.write(pointString(node.endPosition));

  const {namedChildren} = node;
  for (let i = 0, length = namedChildren.length; i < length; i++) {
    process.stdout.write("\n");
    printNode(namedChildren[i], indentLevel + 1);
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
