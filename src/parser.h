#ifndef TREE_SITTER_LOAD_PARSER_H_
#define TREE_SITTER_LOAD_PARSER_H_

#include <v8.h>

namespace node_tree_sitter_compiler {

v8::Handle<v8::Value> LoadParser(const v8::Arguments &args);
void InitParser(v8::Handle<v8::Object> exports);

}  // namespace node_tree_sitter_compiler

#endif  // TREE_SITTER_LOAD_PARSER_H_
