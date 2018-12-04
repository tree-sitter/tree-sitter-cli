#include "./rule_builder.h"
#include <v8.h>
#include <string>
#include "nan.h"

namespace node_tree_sitter_cli {
namespace rule_builder {

using namespace v8;

Nan::Persistent<v8::Function> constructor;

static void GetProperty(Local<String> property, const Nan::PropertyCallbackInfo<v8::Value> &info) {
  Local<Value> symbol_constructor = info.This()->GetInternalField(0);
  Local<Value> rules = info.This()->GetInternalField(1);

  Local<Value> argv = {property};
  Local<Value> symbol = Local<Function>::Cast(symbol_constructor)->Call(Nan::Null(), 1, &argv);

  if (rules->IsObject()) {
    Local<Object> rules_object = Local<Object>::Cast(rules);
    if (!rules_object->HasRealNamedProperty(property)) {
      Nan::Utf8String property_name(property);
      std::string error_message = std::string("Undefined rule '") + *property_name + "'";
      Local<Object> error;
      if (Nan::To<Object>(Nan::ReferenceError(error_message.c_str())).ToLocal(&error)) {
        error->Set(Nan::New("symbol").ToLocalChecked(), symbol);
        info.GetReturnValue().Set(error);
      }
      return;
    }
  }

  info.GetReturnValue().Set(symbol);
}

static void construct(const Nan::FunctionCallbackInfo<Value> &info) {
  if (info.Length() < 2) {
    Nan::ThrowTypeError("Must pass RuleBuilder two arguments");
    return;
  }

  info.This()->SetInternalField(0, info[0]);
  info.This()->SetInternalField(1, info[1]);
}

void Init(Handle<Object> exports) {
  Local<FunctionTemplate> tpl = Nan::New<FunctionTemplate>(construct);
  tpl->SetClassName(Nan::New("RuleBuilder").ToLocalChecked());
  Nan::SetNamedPropertyHandler(tpl->InstanceTemplate(), GetProperty);
  tpl->InstanceTemplate()->SetInternalFieldCount(2);
  constructor.Reset(tpl->GetFunction());
  exports->Set(Nan::New("RuleBuilder").ToLocalChecked(), Nan::New(constructor));
}

}  // namespace rule_builder
}  // namespace node_tree_sitter_cli
