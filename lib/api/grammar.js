var Rules = require("./rules");

module.exports = function grammar(options) {
  if (typeof(options.name) !== "string")
    throw new Error("Grammar's 'name' property must be a string.");
  if (typeof(options.rules) !== "object")
    throw new Error("Grammar's 'rules' property must be an object.");

  var ruleNames = Object.keys(options.rules)
  var ruleBuilder = new RuleBuilder(ruleNames);

  var rules = {};
  ruleNames.forEach(function(ruleName) {
    var ruleFn = options.rules[ruleName];
    if (typeof(ruleFn) !== "function")
      throw new Error("Grammar rules must all be functions. '" + ruleName + "' rule is not.");
    rules[ruleName] = Rules.normalize(ruleFn.call(ruleBuilder));
  });

  var ubiquitousTokens;
  if (options.ubiquitous) {
    if (typeof(options.ubiquitous) !== "function")
      throw new Error("Grammar's 'ubiquitous' property must be a function.");

    ubiquitousTokens = options.ubiquitous
      .call(ruleBuilder)
      .map(Rules.normalize);
  } else {
    ubiquitousTokens = [Rules.normalize(/\s/)];
  }

  return {
    name: options.name,
    ubiquitous: ubiquitousTokens,
    rules: rules,
  };
}

function RuleBuilder(ruleNames) {
  var self = this;
  ruleNames.forEach(function(name) {
    self[name] = Rules.sym(name);
  });
}
