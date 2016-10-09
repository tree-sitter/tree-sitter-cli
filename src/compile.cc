#include "./compile.h"
#include "tree_sitter/compiler.h"

namespace node_tree_sitter_cli {

using namespace v8;

NAN_METHOD(Compile) {
  String::Utf8Value grammar_json(info[0]);
  TSCompileResult compile_result = ts_compile_grammar(*grammar_json);

  if (compile_result.error_type != TSCompileErrorTypeNone) {
    Local<Value> error = Nan::Error(compile_result.error_message);
    Local<Object>::Cast(error)->Set(Nan::New("isGrammarError").ToLocalChecked(), Nan::True());
    Nan::ThrowError(error);
  } else {
    info.GetReturnValue().Set(Nan::New(compile_result.code).ToLocalChecked());
  }
}

}  // namespace node_tree_sitter_cli
