#ifndef TREE_SITTER_COMPILE_H
#define TREE_SITTER_COMPILE_H

#include <v8.h>
#include "nan.h"

namespace node_tree_sitter_cli {

void Generate(const Nan::FunctionCallbackInfo<v8::Value> &);

}  // namespace node_tree_sitter_cli

#endif  // TREE_SITTER_COMPILE_H
