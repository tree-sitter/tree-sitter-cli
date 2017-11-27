#include "./generate.h"
#include "tree_sitter/compiler.h"

namespace node_tree_sitter_cli {

using namespace v8;

void Generate(const Nan::FunctionCallbackInfo<Value> &info) {
  String::Utf8Value grammar_json(info[0]);
  TSCompileResult result = ts_compile_grammar(*grammar_json);

  if (result.error_type != TSCompileErrorTypeNone) {
    Local<Value> error = Nan::Error(result.error_message);
    Local<Object>::Cast(error)->Set(Nan::New("isGrammarError").ToLocalChecked(), Nan::True());
    Nan::ThrowError(error);
  } else {
    info.GetReturnValue().Set(Nan::New(result.code).ToLocalChecked());
  }
}

}  // namespace node_tree_sitter_cli
