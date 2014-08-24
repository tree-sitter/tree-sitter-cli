#ifndef TREE_SITTER_LOAD_LANGUAGE_H_
#define TREE_SITTER_LOAD_LANGUAGE_H_

#include <v8.h>
#include "nan.h"

namespace node_tree_sitter_compiler {

NAN_METHOD(LoadLanguage);

void InitLanguage(v8::Handle<v8::Object> exports);

}  // namespace node_tree_sitter_compiler

#endif  // TREE_SITTER_LOAD_LANGUAGE_H_
