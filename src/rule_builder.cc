#include "./rule_builder.h"
#include <v8.h>
#include <string>
#include "nan.h"

namespace node_tree_sitter_compiler {
namespace rule_builder {

using namespace v8;

Nan::Persistent<v8::Function> constructor;
Nan::Persistent<v8::Function> symbol_fn;

static NAN_METHOD(New) {
  info.GetReturnValue().Set(info.This());
}

NAN_PROPERTY_GETTER(GetProperty) {
  Local<Object> rules = Local<Object>::Cast(info.Data());

  if (!rules->IsObject()) {
    Nan::ThrowError("This should not happend");
    return;
  }

  if (!rules->HasRealNamedProperty(property)) {
    Nan::Utf8String property_name(property);
    info.GetReturnValue().Set(Nan::ReferenceError((std::string("Undefined rule '") + *property_name + "'").c_str()));
    return;
  }

  Handle<Value> argv[1] = { property };
  info.GetReturnValue().Set(Nan::New(symbol_fn)->Call(info.This(), 1, argv));
}

static NAN_METHOD(Build) {
  if (info.Length() != 1 || !info[0]->IsObject()) {
    Nan::ThrowTypeError("A rule hash must be supplied");
    return;
  }

  Local<FunctionTemplate> tpl = Nan::New<FunctionTemplate>(New);
  tpl->SetClassName(Nan::New("RuleBuilder").ToLocalChecked());
  Nan::SetNamedPropertyHandler(tpl->InstanceTemplate(), GetProperty, 0, 0, 0, 0, info[0]);
  info.GetReturnValue().Set(tpl->GetFunction()->NewInstance());
}

static NAN_METHOD(Setup) {
  symbol_fn.Reset(Local<Function>::Cast(info[0]));
  info.GetReturnValue().Set(Nan::New<FunctionTemplate>(Build)->GetFunction());
}

void Init(Handle<Object> exports) {
  exports->Set(Nan::New("setupRuleBuilder").ToLocalChecked(), Nan::New<FunctionTemplate>(Setup)->GetFunction());
}

}  // namespace rule_builder
}  // namespace node_tree_sitter_compiler
