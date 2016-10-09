#include "./compile.h"
#include "./language.h"
#include "./rule_builder.h"
#include <node.h>
#include <v8.h>
#include "nan.h"

namespace node_tree_sitter_cli {

using namespace v8;

void InitAll(Handle<Object> exports) {
  node_tree_sitter_cli::InitLanguage(exports);
  exports->Set(
      Nan::New("compile").ToLocalChecked(),
      Nan::New<FunctionTemplate>(Compile)->GetFunction());
  exports->Set(
      Nan::New("loadLanguage").ToLocalChecked(),
      Nan::New<FunctionTemplate>(LoadLanguage)->GetFunction());
  rule_builder::Init(exports);
}

NODE_MODULE(tree_sitter_cli_binding, InitAll)

}  // namespace node_tree_sitter_cli
