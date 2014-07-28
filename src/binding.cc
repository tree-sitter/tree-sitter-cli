#include "./compile.h"
#include "./load_parser.h"
#include <node.h>

using namespace v8;

void InitAll(Handle<Object> exports) {
  exports->Set(
      String::NewSymbol("compile"),
      FunctionTemplate::New(Compile)->GetFunction());
  exports->Set(
      String::NewSymbol("loadParser"),
      FunctionTemplate::New(LoadParser)->GetFunction());
}

NODE_MODULE(tree_sitter_compiler_binding, InitAll)
