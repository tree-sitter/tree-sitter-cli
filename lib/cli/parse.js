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
    profileCommand(invokeSelfCommand(options, {profile: false}).join(' '), 'tree_sitter', callback)
    return
  }

  let foundError = false

  for (let i = 0; i < options.codePaths.length; i++) {
    const codePath = options.codePaths[i];
    if (fs.statSync(codePath).isDirectory()) {
      const childPaths = [];
      for (const directoryEntry of fs.readdirSync(codePath)) {
        if (!directoryEntry.startsWith('.')) {
          childPaths.push(path.join(codePath, directoryEntry));
        }
      }
      options.codePaths.splice(i, 1, ...childPaths);
      i--;
      continue;
    }
  }

  const maxLength = Math.max(...options.codePaths.map(path => path.length));

  for (const codePath of options.codePaths) {
    document.setInputString(fs.readFileSync(codePath, 'utf8'));

    const t0 = process.hrtime()
    for (let i = 0; i < options.repeat; i++) {
      document.invalidate().parse();
    }
    const [seconds, nanoseconds] = process.hrtime(t0)

    if (!options.quiet && !options.debug && !options.debugGraph) {
      printNode(document.rootNode, 0);
      process.stdout.write("\n");
    }

    const duration = Math.round((seconds * 1000 + nanoseconds / 1000000) / options.repeat);
    if (document.rootNode.hasError()) {
      foundError = true;
      console.log("%s\t%d ms\t%s", pad(codePath, maxLength), duration, firstErrorDescription(document.rootNode));
    } else if (options.time) {
      console.log("%s\t%d ms", pad(codePath, maxLength), duration);
    }
  }

  callback(foundError ? 1 : 0);
};

function firstErrorDescription(node) {
  if (node.type === 'ERROR') {
    return "ERROR " + pointString(node.startPosition) + " - " + pointString(node.endPosition);
  }

  const {namedChildren} = node;
  for (let i = 0, length = namedChildren.length; i < length; i++) {
    const description = firstErrorDescription(namedChildren[i]);
    if (description) return description;
  }
}

function printNode(node, indentLevel) {
  process.stdout.write(' '.repeat(2 * indentLevel));
  process.stdout.write("(");
  process.stdout.write(node.isMissing() ? 'MISSING' : node.type);
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
      JSON.stringify(Object.assign({}, options, overrides)) +
      ",process.exit);"
  ];
}

function pad(string, length) {
  return string + ' '.repeat(length - string.length)
}
