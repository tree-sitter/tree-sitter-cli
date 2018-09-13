#!/usr/bin/env node

const path = require("path");
const minimist = require("minimist");

let args = process.argv.slice(2);
let subcommand = args.shift();
let needsHelp = false;

if (subcommand === 'help') {
  needsHelp = true;
  subcommand = args.shift();
}

let argv = minimist(args);
if (argv.h || argv.help) {
  needsHelp = true;
}

switch (subcommand) {
  case "generate":
    if (needsHelp)
      usage("generate", [
        "Read a `grammar.js` file in the current working directory, and create/update the following files:",
        "",
        "  src/grammar.json - the grammar in JSON format",
        "  src/parser.c     - the parser",
        "  src/binding.cc   - the C++ node.js binding for the parser",
        "  binding.gyp      - the build configuration file for the node.js binding",
        "",
        "Arguments",
        "  --debug, -d      - Log to stderr",
        "  --profile, -P    - Render a flame graph of the parse performance (requires sudo)",
      ]);

    require("./lib/cli/generate")({
      profile: argv.profile || argv.P,
      debug: argv.debug || argv.d
    }, process.exit);
    break;

  case "test":
    if (needsHelp)
      usage("test", [
        "Run the tests for the parser in the current working directory.",
        "",
        "Arguments",
        "  --focus, -f <string>  - Only run tests whose name contain the given string",
        "  --debug, -d           - Output debugging information during parsing"
      ]);

    require("./lib/cli/test")({
      focus: argv.focus || argv.f,
      debug: argv.debug || argv.d,
      debugGraph: argv['debug-graph'] || argv.D
    }, process.exit);
    break;

  case "parse":
    const codePaths = argv._;
    if (needsHelp || codePaths.length === 0)
      usage("parse <code-file>", [
        "Parse the given file using the parser in the current working directory and print the syntax tree.",
        "",
        "Arguments",
        "  code-path          - The file to parse",
        "  --quiet, -q        - Parse, but don't print any output",
        "  --time, -t         - Print the time it took to parse",
        "  --debug, -d        - Print a log of parse actions",
        "  --debug-graph, -D  - Render a sequence of diagrams showing the changing parse stack",
        "  --profile, -P      - Render a flame graph of the parse performance (requires sudo)",
        "  --heap, -H         - Report heap allocation breakdown (requires google perf tools)",
        "  --repeat <count>   - Parse the file the given number of times (useful for profiling)",
        "  --edit <edits>     - Reparse the file after performing the given edit.",
        "                       For example, pass '5,3,\"x\"' to delete three characters and",
        "                       insert an 'x' at index 5. You can repeat this flag multiple times",
        "                       to perform a series of edits."
      ]);

    require("./lib/cli/parse")({
      codePaths: codePaths,
      debugGraph: argv['debug-graph'] || argv.D,
      debug: argv.debug || argv.d,
      quiet: argv.quiet || argv.q,
      time: argv.time || argv.t,
      profile: argv.profile || argv.P,
      heapProfile: argv.heap || argv.H,
      repeat: argv.repeat,
      edits: argv.edit
    }, process.exit);
    break;

  default:
    usage("<generate|test|parse> [flags]", [
      "Run `tree-sitter <command> --help` for more information about a particular command."
    ])
    break;
}

function usage(command, lines) {
  console.log("Usage: tree-sitter " + command + "\n");
  if (lines)
    console.log(lines.join('\n') + '\n')
  process.exit(0);
}
