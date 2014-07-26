var fs = require("fs"),
    path = require("path"),
    ejs = require("ejs");

var bindingGypTemplate = fs.readFileSync(
  path.join(__dirname, "..", "templates", "binding.gyp.ejs"),
  "utf8");

var initCCTemplate = fs.readFileSync(
  path.join(__dirname, "..", "templates", "init.cc.ejs"),
  "utf8");

var indexJSTemplate = fs.readFileSync(
  path.join(__dirname, "..", "templates", "index.js.ejs"),
  "utf8");

exports.bindingGyp = function gyp(parserName) {
  return ejs.render(bindingGypTemplate, { parserName: parserName });
};

exports.initCC = function code(parserName) {
  return ejs.render(initCCTemplate, { parserName: parserName });
};

exports.indexJS = function code(parserName) {
  return ejs.render(indexJSTemplate, { parserName: parserName });
};
