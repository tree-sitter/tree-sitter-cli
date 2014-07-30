var fs = require("fs"),
    path = require("path"),
    ejs = require("ejs");

var bindingGypTemplate = fs.readFileSync(
  path.join(__dirname, "templates", "binding.gyp.ejs"),
  "utf8");

var bindingCCTemplate = fs.readFileSync(
  path.join(__dirname, "templates", "binding.cc.ejs"),
  "utf8");

var indexJSTemplate = fs.readFileSync(
  path.join(__dirname, "templates", "index.js.ejs"),
  "utf8");

exports.bindingGyp = function(parserName) {
  return ejs.render(bindingGypTemplate, { parserName: parserName });
};

exports.bindingCC = function(parserName) {
  return ejs.render(bindingCCTemplate, {
    parserName: parserName,
    camelizedParserName: camelize(parserName)
  });
};

exports.indexJS = function(parserName) {
  return ejs.render(indexJSTemplate, { parserName: parserName });
};

function camelize(str) {
  return (str[0].toUpperCase() + str.slice(1)).replace(/_(\w)/, function(_, match) {
    return match.toUpperCase();
  });
}
