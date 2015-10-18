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
    return pattern(value.toString().slice(1, -1));
  case TypeError:
    throw value
  default:
    return value;
  }
};

module.exports = {
  blank: blank,
  choice: choice,
  err: err,
  normalize: normalize,
  optional: optional,
  prec: prec,
  repeat: repeat,
  seq: seq,
  sym: sym,
  token: token
};
