#include "./compile.h"
#include <node.h>

using namespace v8;

void InitAll(Handle<Object> exports) {
  exports->Set(
      String::NewSymbol("compile"),
      FunctionTemplate::New(Compile)->GetFunction());
}

NODE_MODULE(tree_sitter_compiler_binding, InitAll)
