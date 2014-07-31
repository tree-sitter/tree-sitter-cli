#include <node.h>
#include <uv.h>
#include <string>
#include "tree_sitter/runtime.h"

using namespace v8;

namespace node_tree_sitter_compiler {

static Persistent<Function> constructor;

Handle<Value> LoadLanguage(const Arguments &args) {
  HandleScope scope;

  Handle<String> js_filename = Handle<String>::Cast(args[0]);
  Handle<String> js_language_name = Handle<String>::Cast(args[1]);
  String::Utf8Value filename(js_filename);
  String::Utf8Value language_name(js_language_name);

  uv_lib_t parser_lib;
  int error_code = uv_dlopen(*filename, &parser_lib);
  if (error_code) {
    Handle<String> message = String::New(uv_dlerror(&parser_lib));
    ThrowException(Exception::Error(
        String::Concat(String::New("Couldn't open language file - "), message)));
    return scope.Close(Undefined());
  }

  TSLanguage *language = NULL;
  error_code = uv_dlsym(&parser_lib, (std::string("ts_language_") + *language_name).c_str(), (void **)&language);
  if (error_code) {
    Handle<String> message = String::New(uv_dlerror(&parser_lib));
    ThrowException(Exception::Error(
        String::Concat(String::New("Couldn't load language - "), message)));
    return scope.Close(Undefined());
  }

  if (!language) {
    ThrowException(Exception::Error(String::New("Could not load language")));
    return scope.Close(Undefined());
  }

  Local<Object> instance = constructor->NewInstance();
  instance->SetInternalField(0, External::New((void *)language));
  return scope.Close(instance);
}

static Handle<Value> NewLanguage(const Arguments &args) {
  HandleScope scope;
  return scope.Close(Undefined());
}

void InitLanguage(v8::Handle<v8::Object> exports) {
  Local<FunctionTemplate> tpl = FunctionTemplate::New(NewLanguage);
  tpl->SetClassName(String::NewSymbol("DynamicallyLoadedLanguage"));
  tpl->InstanceTemplate()->SetInternalFieldCount(1);
  constructor = Persistent<Function>::New(tpl->GetFunction());
}

}  // namespace node_tree_sitter_compiler
