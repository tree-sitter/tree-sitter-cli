#ifndef TREE_SITTER_COMPILE_H
#define TREE_SITTER_COMPILE_H

#include <v8.h>

namespace node_tree_sitter_compiler {

v8::Handle<v8::Value> Compile(const v8::Arguments& args);

}  // namespace node_tree_sitter_compiler

#endif  // TREE_SITTER_COMPILE_H
