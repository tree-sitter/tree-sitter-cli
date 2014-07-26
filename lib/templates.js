var fs = require("fs"),
    path = require("path"),
    ejs = require("ejs");

var gypTemplate = fs.readFileSync(
  path.join(__dirname, "..", "templates", "binding.gyp.ejs"),
  "utf8");

var parserTemplate = fs.readFileSync(
  path.join(__dirname, "..", "templates", "parser.cc.ejs"),
  "utf8");

exports.gyp = function gyp(parserName) {
  return ejs.render(gypTemplate, { parserName: parserName });
};

exports.code = function code(parserName) {
  return ejs.render(parserTemplate, { parserName: parserName });
};
