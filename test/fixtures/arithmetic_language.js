const { dsl, generate, loadLanguage } = require("../..");
const { grammar, seq, choice, prec, repeat, token } = dsl;

module.exports = loadLanguage(generate(grammar({
  name: "arithmetic",

  rules: {
    program: $ => $._expression,

    _expression: $ =>
      choice(
        $.sum,
        $.difference,
        $.product,
        $.quotient,
        $.number,
        $.variable
      ),

    sum: $ => prec.left(0, seq($._expression, "+", $._expression)),

    difference: $ => prec.left(0, seq($._expression, "-", $._expression)),

    product: $ => prec.left(1, seq($._expression, "*", $._expression)),

    quotient: $ => prec.left(1, seq($._expression, "/", $._expression)),

    number: $ => /\d+/,

    variable: $ => token(seq(/[a-z]/, repeat(choice(/\w/, "👍", "👎"))))
  }
})));
