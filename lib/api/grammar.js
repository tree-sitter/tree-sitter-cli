var Rules = require("./rules");

module.exports = function grammar(grammarHash) {
  return {
    name: getName(grammarHash),
    ubiquitous: grammarHash.ubiquitous,
    separators: grammarHash.separators,
    rules: getRules(grammarHash)
  };
}

function getName(grammarHash) {
  if (typeof(grammarHash.name) != "string")
    throw new Error("grammar's 'name' property must be a string");
  return grammarHash.name;
}

function getRules(grammarHash) {
  if (typeof(grammarHash.rules) != "object")
    throw new Error("grammar's 'rules' property must be an object");

  var rules = {};
  var ruleNames = Object.keys(grammarHash.rules)
  var builder = new RuleBuilder(ruleNames);

  ruleNames.forEach(function(ruleName) {
    var ruleFn = grammarHash.rules[ruleName];
    rules[ruleName] = Rules.normalize(ruleFn.call(builder));
  });

  return rules;
}

function RuleBuilder(ruleNames) {
  var self = this;
  ruleNames.forEach(function(name) {
    self[name] = Rules.sym(name);
  });
}
