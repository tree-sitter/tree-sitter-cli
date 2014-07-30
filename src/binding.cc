#include "./compile.h"
#include "./parser.h"
#include <node.h>

namespace node_tree_sitter_compiler {

using namespace v8;

void InitAll(Handle<Object> exports) {
  node_tree_sitter_compiler::InitParser(exports);
  exports->Set(
      String::NewSymbol("compile"),
      FunctionTemplate::New(Compile)->GetFunction());
  exports->Set(
      String::NewSymbol("loadParser"),
      FunctionTemplate::New(LoadParser)->GetFunction());
}

NODE_MODULE(tree_sitter_compiler_binding, InitAll)

}  // namespace node_tree_sitter_compiler
