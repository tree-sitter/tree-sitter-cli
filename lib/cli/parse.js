module.exports = function parse(options, callback) {
  const fs = require("fs");
  const path = require("path");
  const {spawn, execSync, spawnSync} = require("child_process");
  const temp = require("temp");
  const Parser = require("tree-sitter");
  const profileCommand = require('./helpers/profile-command');

  const cwd = process.cwd();
  const language = require(cwd);
  const parser = new Parser().setLanguage(language);

  if (options.repeat) {
    console.log("Benchmarking with %d repetitions", options.repeat);
  } else {
    options.repeat = 1;
  }

  if (options.heapProfile) {
    const command = invokeSelfCommand(options, {
      heapProfile: false,
      repeat: null,
      quiet: true
    });

    const parseProcess = spawn(command[0], command.slice(1), {
      env: {
        DYLD_INSERT_LIBRARIES: '/usr/local/lib/libtcmalloc.dylib',
        HEAPPROFILE: 'heap'
      },
      stdio: ['ignore', 'inherit', 'pipe']
    });

    let heapProfileOutput = ''
    parseProcess.stderr.on('data', chunk => {
      heapProfileOutput += chunk.toString('utf8')
    });

    parseProcess.on('close', code => {
      const heapProfilePaths = heapProfileOutput.match(/\S+\.heap/g)
      const heapProfilePath = heapProfilePaths.pop()
      const pprofProcess = spawn('pprof', [
        '--text',
        '--focus=parse',
        process.execPath,
        heapProfilePath
      ], {stdio: ['ignore', 'inherit', 'inherit']});
      pprofProcess.on('close', callback);
    });

    return;
  } else if (options.debugGraph) {
    const dotOutputFile = temp.openSync({prefix: 'stack-debug', suffix: '.dot'});
    const htmlOutputFile = temp.openSync({prefix: 'stack-debug', suffix: '.html'});

    const command = invokeSelfCommand(options, {
      debugGraph: false,
      isDebuggingGraph: true
    });
    const parseProcess = spawn(command[0], command.slice(1), {
      stdio: ['ignore', 'ignore', dotOutputFile.fd]
    });

    process.on('SIGINT', () => parseProcess.kill())

    parseProcess.on('close', code => {

      // If the parse process was killed before completing, it may have written a
      // partial graph, which would cause an error when running `dot`. Find the
      // last empty line and truncate the file to that line.
      const trimmedDotFilePath = dotOutputFile.path + '.trimmed';
      const trimmedDotFilePid = fs.openSync(trimmedDotFilePath, 'w+');
      const lastBlankLineNumber = execSync(`grep -n '^$' ${dotOutputFile.path} | tail -n1`)
        .toString('utf8')
        .split(':')[0];
      spawnSync('head', ['-n', lastBlankLineNumber, dotOutputFile.path], {
        stdio: ['ignore', trimmedDotFilePid]
      });
      fs.renameSync(trimmedDotFilePath, dotOutputFile.path);

      // Create an HTML file with some basic styling for SVG graphs.
      fs.writeSync(htmlOutputFile.fd, [
        "<!DOCTYPE html>",
        "<style>svg { width: 100%; margin-bottom: 20px; }</style>"
      ].join('\n'));

      // Write the graphs to the HTML file using `dot`.
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
        const openCommand = process.platform === 'linux'
          ? 'xdg-open'
          : 'open';
        spawn(openCommand, [htmlOutputFile.path]);
      });
    });

    return
  } else if (options.isDebuggingGraph) {
    parser.printDotGraphs(true);
    console.log = function() {}
  } else if (options.debug) {
    parser.setLogger(function(topic, params, type) {
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
    if (codePath !== '-' && fs.statSync(codePath).isDirectory()) {
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
    let sourceCode = fs.readFileSync(codePath === '-' ? 0 : codePath, 'utf8')

    let tree;
    const t0 = process.hrtime()
    for (let i = 0; i < options.repeat; i++) {
      tree = parser.parse(sourceCode);
      if (options.edits) {
        if (!Array.isArray(options.edits)) options.edits = [options.edits]
        for (const edit of options.edits) {
          let [startIndex, lengthRemoved] = edit.split(',', 2)
          const newText = JSON.parse(edit.slice(startIndex.length + lengthRemoved.length + 2))
          startIndex = parseInt(startIndex);
          lengthRemoved = parseInt(lengthRemoved);
          const prefix = sourceCode.slice(0, startIndex);
          const deletedText = sourceCode.slice(startIndex, startIndex + lengthRemoved);
          const suffix = sourceCode.slice(startIndex + lengthRemoved);
          const startPosition = getExtent(prefix);
          sourceCode = prefix + newText + suffix;
          tree.edit({
            startIndex,
            oldEndIndex: startIndex + lengthRemoved,
            newEndIndex: startIndex + newText.length,
            startPosition,
            oldEndPosition: addPoint(startPosition, getExtent(deletedText)),
            newEndPosition: addPoint(startPosition, getExtent(newText))
          })
          tree = parser.parse(sourceCode, tree)
        }
      }
    }
    const [seconds, nanoseconds] = process.hrtime(t0)

    if (!options.quiet && !options.debug && !options.debugGraph) {
      printNode(tree.rootNode, 0);
      process.stdout.write("\n");
    }

    const duration = Math.round((seconds * 1000 + nanoseconds / 1000000) / options.repeat);
    if (tree.rootNode.hasError()) {
      foundError = true;
      console.log("%s\t%d ms\t%s", pad(codePath, maxLength), duration, firstErrorDescription(tree.rootNode));
    } else if (options.time) {
      console.log("%s\t%d ms", pad(codePath, maxLength), duration);
    }
  }

  callback(foundError ? 1 : 0);
};

function firstErrorDescription(node) {
  if (!node.hasError) return null;

  if (node.type === 'ERROR') {
    return "ERROR " + pointString(node.startPosition) + " - " + pointString(node.endPosition);
  }

  if (node.isMissing()) {
    return "MISSING " + node.type + " " + pointString(node.startPosition) + " - " + pointString(node.endPosition);
  }

  const {children} = node;
  for (let i = 0, length = children.length; i < length; i++) {
    const description = firstErrorDescription(children[i]);
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

function addPoint(a, b) {
  if (b.row > 0) {
    return {row: a.row + b.row, column: b.column};
  } else {
    return {row: a.row, column: a.column + b.column};
  }
}


function getExtent (string) {
  const result = {row: 0, column: 0}
  for (const character of string) {
    if (character === '\n') {
      result.row++
      result.column = 0
    } else {
      result.column++
    }
  }
  return result
}
