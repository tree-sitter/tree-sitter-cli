const binding = require("./binding");
const UNICODE_ESCAPE_PATTERN = /\\u([0-9a-f]{4})/gi;

function blank() {
  return {
    type: "BLANK"
  };
}

function choice() {
  return {
    type: "CHOICE",
    members: normalizeList(arguments)
  };
}

function err(content) {
  return {
    type: "ERROR",
    content: content
  };
}

function pattern(value) {
  return {
    type: "PATTERN",
    value: value
  };
}

function prec(number, rule) {
  if (rule == null) {
    rule = number;
    number = 0;
  }

  return {
    type: "PREC",
    value: number,
    content: normalize(rule)
  };
}

prec.left = function(number, rule) {
  if (rule == null) {
    rule = number;
    number = 0;
  }

  return {
    type: "PREC_LEFT",
    value: number,
    content: normalize(rule)
  };
}

prec.right = function(number, rule) {
  if (rule == null) {
    rule = number;
    number = 0;
  }

  return {
    type: "PREC_RIGHT",
    value: number,
    content: normalize(rule)
  };
}

function repeat(rule) {
  return {
    type: "REPEAT",
    content: normalize(rule)
  };
}

function repeat1(rule) {
  return {
    type: "REPEAT1",
    content: normalize(rule)
  };
}

function seq() {
  return {
    type: "SEQ",
    members: normalizeList(arguments)
  };
}

function string(value) {
  return {
    type: "STRING",
    value: value
  };
}

function sym(name) {
  return {
    type: "SYMBOL",
    name: name
  };
}

function token(value) {
  return {
    type: "TOKEN",
    content: value
  };
}

function optional(value) {
  return choice(value, blank());
}

function normalizeList(list) {
  var result = [];
  for (var i = 0; i < list.length; i++) {
    result.push(normalize(list[i]));
  }
  return result;
}

function normalize(value) {
  if (typeof value == "undefined")
    throw new Error("Undefined symbol");

  switch (value.constructor) {
  case String:
    return string(value);
  case RegExp:
    return pattern(value.source.replace(
      UNICODE_ESCAPE_PATTERN,
      function(match, group) {
        return String.fromCharCode(parseInt(group, 16));
      }
    ));
  case ReferenceError:
    throw value
  default:
    if (typeof value.type === 'string') {
      return value;
    } else {
      throw new TypeError("Invalid rule: " + value.toString());
    }
  }
};

const RuleBuilder = binding.setupRuleBuilder(sym);

function grammar(baseGrammar, options) {
  if (!options) {
    options = baseGrammar;
    baseGrammar = {
      name: null,
      rules: {},
      extras: [normalize(/\s/)],
      conflicts: [],
      externals: [],
    };
  }

  var externalsRuleBuilder = new RuleBuilder()

  var externals = []
  if (options.externals) {
    if (typeof(options.externals) !== 'function')
      throw new Error("Grammar's 'externals' property must be a function")

    var externalRules = options.externals.call(externalsRuleBuilder, externalsRuleBuilder)

    if (!Array.isArray(externalRules))
      throw new Error("Grammar's externals must be an array of rules.");

    externals = externalRules.map(symbol => symbol.name)
  }

  var rulesSet = {};
  for (var key in options.rules)
    rulesSet[key] = true;
  for (var key in baseGrammar.rules)
    rulesSet[key] = true;
  for (let name of externals)
    rulesSet[name] = true;
  var ruleBuilder = new RuleBuilder(rulesSet);

  var name = options.name;
  if (typeof(options.name) !== "string")
    throw new Error("Grammar's 'name' property must be a string.");

  var rules = {};
  for (var key in baseGrammar.rules)
    rules[key] = baseGrammar.rules[key];
  if (options.rules) {
    if (typeof(options.rules) !== "object")
      throw new Error("Grammar's 'rules' property must be an object.");

    Object.keys(options.rules).forEach(function(ruleName) {
      var ruleFn = options.rules[ruleName];
      if (typeof(ruleFn) !== "function")
        throw new Error("Grammar rules must all be functions. '" + ruleName + "' rule is not.");
      rules[ruleName] = normalize(ruleFn.call(ruleBuilder, ruleBuilder, baseGrammar.rules[ruleName]));
    });
  }

  var extraTokens = baseGrammar.extras;
  if (options.extras) {
    if (typeof(options.extras) !== "function")
      throw new Error("Grammar's 'extras' property must be a function.");

    extraTokens = options.extras
      .call(ruleBuilder, ruleBuilder, baseGrammar.extras)
      .map(normalize);
  }

  var expectedConflicts = baseGrammar.conflicts;
  if (options.conflicts) {
    if (typeof(options.conflicts) !== "function")
      throw new Error("Grammar's 'conflicts' property must be a function.");

    var baseExpectedConflictRules = baseGrammar.conflicts.map((conflict) => conflict.map(sym));
    var expectedConflictRules = options.conflicts.call(ruleBuilder, ruleBuilder, baseExpectedConflictRules);

    if (!Array.isArray(expectedConflictRules))
      throw new Error("Grammar's conflicts must be an array of arrays of rules.");

    expectedConflicts = expectedConflictRules.map(function(conflictSet) {
      if (!Array.isArray(conflictSet))
        throw new Error("Grammar's conflicts must be an array of arrays of rules.");
      return conflictSet.map(function(symbol) { return symbol.name; });
    });
  }

  if (Object.keys(rules).length == 0) {
    throw new Error("Grammar must have at least one rule.");
  }

  return {
    name: name,
    rules: rules,
    extras: extraTokens,
    conflicts: expectedConflicts,
    externals: externals
  };
}

module.exports = {
  grammar: grammar,

  blank: blank,
  choice: choice,
  err: err,
  optional: optional,
  prec: prec,
  repeat: repeat,
  repeat1: repeat1,
  seq: seq,
  sym: sym,
  token: token
};
