#ifndef TREE_SITTER_LOAD_LANGUAGE_H_
#define TREE_SITTER_LOAD_LANGUAGE_H_

#include <v8.h>

namespace node_tree_sitter_compiler {

v8::Handle<v8::Value> LoadLanguage(const v8::Arguments &args);
void InitLanguage(v8::Handle<v8::Object> exports);

}  // namespace node_tree_sitter_compiler

#endif  // TREE_SITTER_LOAD_LANGUAGE_H_
