module.exports = {
  compile: require("./lib/binding").compile,
  compileAndLoad: require("./lib/compile_and_load"),
  grammar: require("./lib/grammar"),
  rules: require("./lib/rules")
};
