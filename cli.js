#!/usr/bin/env node

var compileCommand = require("./lib/cli/compile"),
    testCommand = require("./lib/cli/test"),
    parseCommand = require("./lib/cli/parse"),
    path = require("path"),
    argv = require("yargs").argv;

var execName = path.basename(process.argv[1]);
var needsHelp = argv.help || argv.h;

switch (argv._[0]) {
  case "compile":
    if (needsHelp)
      usage("compile", [
        "Read a `grammar.js` file in the current working directory, and create/update the following files:",
        "  src/grammar.json - the grammar in JSON format",
        "  src/parser.c     - the parser",
        "  src/binding.cc   - the C++ node.js binding for the parser",
        "  binding.gyp      - the build configuration file for the node.js binding",
      ]);

    compileCommand({
      profile: argv.profile || argv.P,
    }, process.exit);
    break;

  case "test":
    if (needsHelp)
      usage("test", [
        "Flags",
        "  --focus, -f <string>  - Only run tests whose name contain the given string",
        "  --debug, -d           - Output debugging information during parsing"
      ]);

    testCommand({
      focus: argv.focus || argv.f,
      debug: argv.debug || argv.d,
      debugGraph: argv['debug-graph'] || argv.D
    }, process.exit);
    break;

  case "parse":
    var codePath = argv._[1];

    if (needsHelp || !codePath)
      usage("parse <code-file>", [
        "Parse the given file using the parser in the current working directory.",
        "",
        "Arguments",
        "  code-path          - The file to parse",
        "  --print, -p        - Print the syntax tree",
        "  --debug, -d        - Print a log of parse actions",
        "  --debug-graph, -D  - Render a sequence of diagrams showing the changing parse stack",
        "  --profile, -P      - Render a flame graph of the parse performance (requires sudo)",
        "  --repeat <count>   - Parse the file the given number of times (useful for profiling)"
      ]);

    parseCommand({
      codePath: argv._[1],
      debugGraph: argv['debug-graph'] || argv.D,
      debug: argv.debug || argv.d,
      print: argv.print || argv.p,
      profile: argv.profile || argv.P,
      repeat: argv.repeat
    }, process.exit);
    break;

  default:
    usage("<compile|test|parse> [flags]")
    break;
}

function usage(command, lines) {
  console.log("Usage: " + execName + " " + command + "\n");
  if (lines)
    console.log(lines.join('\n') + '\n')
  process.exit(0);
}
