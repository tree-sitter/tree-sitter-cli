#include "./compile.h"
#include "./language.h"
#include <node.h>

namespace node_tree_sitter_compiler {

using namespace v8;

void InitAll(Handle<Object> exports) {
  node_tree_sitter_compiler::InitLanguage(exports);
  exports->Set(
      String::NewSymbol("compile"),
      FunctionTemplate::New(Compile)->GetFunction());
  exports->Set(
      String::NewSymbol("loadLanguage"),
      FunctionTemplate::New(LoadLanguage)->GetFunction());
}

NODE_MODULE(tree_sitter_compiler_binding, InitAll)

}  // namespace node_tree_sitter_compiler
