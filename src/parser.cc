#include <node.h>
#include <uv.h>
#include <string>
#include "tree_sitter/runtime.h"

using namespace v8;

namespace node_tree_sitter_compiler {

static Persistent<Function> constructor;

Handle<Value> LoadParser(const Arguments &args) {
  HandleScope scope;

  Handle<String> js_filename = Handle<String>::Cast(args[0]);
  Handle<String> js_parser_name = Handle<String>::Cast(args[1]);
  String::Utf8Value filename(js_filename);
  String::Utf8Value parser_name(js_parser_name);

  uv_lib_t parser_lib;
  int error_code = uv_dlopen(*filename, &parser_lib);
  if (error_code) {
    Handle<String> message = String::New(uv_dlerror(&parser_lib));
    ThrowException(Exception::Error(
        String::Concat(String::New("Error opening parser file - "), message)));
  }

  TSParser * (* parser_constructor)();
  error_code = uv_dlsym(&parser_lib, (std::string("ts_parser_") + *parser_name).c_str(), (void **)&parser_constructor);
  if (error_code) {
    Handle<String> message = String::New(uv_dlerror(&parser_lib));
    ThrowException(Exception::Error(
        String::Concat(String::New("Error loading parser from parser file - "), message)));
  }

  Local<Object> instance = constructor->NewInstance();
  instance->SetInternalField(0, External::New(parser_constructor()));
  return scope.Close(instance);
}

static Handle<Value> NewParser(const Arguments &args) {
  HandleScope scope;
  return scope.Close(Undefined());
}

void InitParser(v8::Handle<v8::Object> exports) {
  Local<FunctionTemplate> tpl = FunctionTemplate::New(NewParser);
  tpl->SetClassName(String::NewSymbol("DynamicallyLoadedParser"));
  tpl->InstanceTemplate()->SetInternalFieldCount(1);

  constructor = Persistent<Function>::New(tpl->GetFunction());
}

}  // namespace node_tree_sitter_compiler
