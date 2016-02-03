#!/usr/bin/env node

var compileCommand = require("./lib/cli/compile"),
    testCommand = require("./lib/cli/test"),
    parseCommand = require("./lib/cli/parse"),
    path = require("path"),
    argv = require("yargs").argv;

switch (argv._[0]) {
  case "compile":
    process.exit(compileCommand());
    break;

  case "test":
    testCommand({
      focus: argv.f || argv.focus,
      debug: argv.d || argv.debug
    }, process.exit);
    break;

  case "parse":
    parseCommand({
      debug: argv.d || argv.debug,
      codePath: argv._[1],
      print: argv.print !== false
    });
    break;

  case undefined:
    console.log("Usage: %s <compile|test>", path.basename(process.argv[1]));
    break;

  default:
    console.log("Unrecognized command '%s'", command);
    break;
}
