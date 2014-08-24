#include "./compile.h"
#include "./language.h"
#include <node.h>
#include <v8.h>
#include "nan.h"

namespace node_tree_sitter_compiler {

using namespace v8;

void InitAll(Handle<Object> exports) {
  node_tree_sitter_compiler::InitLanguage(exports);
  exports->Set(
      NanNew("compile"),
      NanNew<FunctionTemplate>(Compile)->GetFunction());
  exports->Set(
      NanNew("loadLanguage"),
      NanNew<FunctionTemplate>(LoadLanguage)->GetFunction());
}

NODE_MODULE(tree_sitter_compiler_binding, InitAll)

}  // namespace node_tree_sitter_compiler
