#include <node.h>
#include <uv.h>
#include <string>
#include "tree_sitter/runtime.h"
#include "nan.h"

using namespace v8;

namespace node_tree_sitter_cli {

static Nan::Persistent<Function> constructor;

void LoadLanguage(const Nan::FunctionCallbackInfo<Value> &info) {
  Handle<String> js_lib_file_name = Handle<String>::Cast(info[0]);
  Handle<String> js_language_function_name = Handle<String>::Cast(info[1]);
  std::string language_function_name(*String::Utf8Value(js_language_function_name));
  std::string lib_file_name(*String::Utf8Value(js_lib_file_name));

  uv_lib_t parser_lib;
  int error_code = uv_dlopen(lib_file_name.c_str(), &parser_lib);
  if (error_code) {
    std::string message(uv_dlerror(&parser_lib));
    Nan::ThrowError(("Couldn't open language file - " + message).c_str());
    return;
  }

  const TSLanguage * (* language_fn)() = NULL;
  error_code = uv_dlsym(&parser_lib, language_function_name.c_str(), (void **)&language_fn);
  if (error_code) {
    std::string message(uv_dlerror(&parser_lib));
    Nan::ThrowError(("Couldn't load language function - " + message).c_str());
    return;
  }

  if (!language_fn) {
    Nan::ThrowError("Could not load language");
    return;
  }

  Local<Object> instance = Nan::New(constructor)->NewInstance(Nan::GetCurrentContext()).ToLocalChecked();
  Nan::SetInternalFieldPointer(instance, 0, (void *)language_fn());
  info.GetReturnValue().Set(instance);
}

NAN_METHOD(NewLanguage) {
  info.GetReturnValue().Set(Nan::Null());
}

void InitLanguage(v8::Handle<v8::Object> exports) {
  Local<FunctionTemplate> tpl = Nan::New<FunctionTemplate>(NewLanguage);
  tpl->SetClassName(Nan::New("DynamicallyLoadedLanguage").ToLocalChecked());
  tpl->InstanceTemplate()->SetInternalFieldCount(1);
  constructor.Reset(tpl->GetFunction());
}

}  // namespace node_tree_sitter_cli
