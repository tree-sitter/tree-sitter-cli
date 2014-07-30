#!/usr/bin/env node

var cli = require("./lib/cli"),
    path = require("path"),
    command = process.argv[2];

switch (command) {
  case "compile":
    cli.compile();
    break;

  case "test":
    cli.test(process.exit);
    break;

  case undefined:
    console.log("Usage: %s <compile|test>", path.basename(process.argv[1]));
    break;

  default:
    console.log("Unrecognized command '%s'", command);
    break;
}
