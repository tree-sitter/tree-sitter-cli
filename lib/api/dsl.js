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

function err(value) {
  return {
    type: "ERROR",
    value: value
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
    rule: normalize(rule)
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
    rule: normalize(rule)
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
    rule: normalize(rule)
  };
}

function repeat(rule) {
  return {
    type: "REPEAT",
    value: normalize(rule)
  };
}

function repeat1(rule) {
  return {
    type: "REPEAT1",
    value: normalize(rule)
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
    value: value
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
    return value;
  }
};

const RuleBuilder = binding.setupRuleBuilder(sym);

function grammar(options) {
  if (typeof(options.name) !== "string")
    throw new Error("Grammar's 'name' property must be a string.");

  if (typeof(options.rules) !== "object")
    throw new Error("Grammar's 'rules' property must be an object.");

  var ruleBuilder = new RuleBuilder(options.rules);

  var rules = {};
  Object.keys(options.rules).forEach(function(ruleName) {
    var ruleFn = options.rules[ruleName];
    if (typeof(ruleFn) !== "function")
      throw new Error("Grammar rules must all be functions. '" + ruleName + "' rule is not.");
    rules[ruleName] = normalize(ruleFn.call(ruleBuilder));
  });

  var ubiquitousTokens;
  if (options.ubiquitous) {
    if (typeof(options.ubiquitous) !== "function")
      throw new Error("Grammar's 'ubiquitous' property must be a function.");

    ubiquitousTokens = options.ubiquitous
      .call(ruleBuilder)
      .map(normalize);
  } else {
    ubiquitousTokens = [normalize(/\s/)];
  }

  var expectedConflicts;
  if (options.expectedConflicts) {
    if (typeof(options.expectedConflicts) !== "function")
      throw new Error("Grammar's 'expectedConflicts' property must be a function.");
    expectedConflicts = options.expectedConflicts.call(ruleBuilder)
    if (!Array.isArray(expectedConflicts))
      throw new Error("Grammar's 'expectedConflicts' must be an array of arrays of rules.");
    expectedConflicts = expectedConflicts.map(function(conflictSet) {
      if (!Array.isArray(conflictSet))
        throw new Error("Grammar's 'expectedConflicts' must be an array of arrays of rules.");
      return conflictSet.map(function(symbol) { return symbol.name; });
    });
  }

  return {
    name: options.name,
    rules: rules,
    ubiquitous: ubiquitousTokens,
    expectedConflicts: expectedConflicts,
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
