#include <tree_sitter/parser.h>

enum {
  EXTERNAL_A,
  EXTERNAL_B
};

void *tree_sitter_test_grammar_external_scanner_create() {
  return NULL;
}

void tree_sitter_test_grammar_external_scanner_destroy(void *payload) {
}

bool tree_sitter_test_grammar_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
  while (lexer->lookahead == ' ') {
    lexer->advance(lexer, true);
  }

  if (lexer->lookahead == 'a') {
    lexer->advance(lexer, false);
    lexer->result_symbol = EXTERNAL_A;
    return true;
  }

  if (lexer->lookahead == 'b') {
    lexer->advance(lexer, false);
    lexer->result_symbol = EXTERNAL_B;
    return true;
  }

  return false;
}

void tree_sitter_test_grammar_external_scanner_reset(void *payload) {
}

bool tree_sitter_test_grammar_external_scanner_serialize(void *payload, TSExternalTokenState state) {
  return true;
}

void tree_sitter_test_grammar_external_scanner_deserialize(void *payload, TSExternalTokenState state) {
}
