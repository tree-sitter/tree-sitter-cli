#ifndef TREE_SITTER_LOAD_LANGUAGE_H_
#define TREE_SITTER_LOAD_LANGUAGE_H_

#include <v8.h>
#include "nan.h"

namespace node_tree_sitter_cli {

void LoadLanguage(const Nan::FunctionCallbackInfo<v8::Value> &);
void InitLanguage(v8::Handle<v8::Object> exports);

}  // namespace node_tree_sitter_cli

#endif  // TREE_SITTER_LOAD_LANGUAGE_H_
