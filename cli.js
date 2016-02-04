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

    process.exit(compileCommand());
    break;

  case "test":
    if (needsHelp)
      usage("test", [
        "Flags",
        "  -f <string> - Only run tests whose name contain the given string",
        "  -d          - Output debugging information during parsing",
      ]);

    testCommand({
      focus: argv.f || argv.focus,
      debug: argv.d || argv.debug
    }, process.exit);
    break;

  case "parse":
    var codePath = argv._[1];

    if (needsHelp || !codePath)
      usage("parse <code-file>", [
        "Parse the given file using the parser in the current working directory.",
        "",
        "Arguments",
        "  code-path        - The file to parse",
        "  -p, --print      - Print the syntax tree",
        "  --profile        - Profile parsing using dtrace (requires sudo)",
        "  --repeat <count> - Parse the file the given number of times (useful for profiling)"
      ]);

    parseCommand({
      debug: argv.d || argv.debug,
      codePath: argv._[1],
      print: argv.print,
      profile: argv.profile,
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
