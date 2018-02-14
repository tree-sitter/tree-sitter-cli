#include "./rule_builder.h"
#include <v8.h>
#include <string>
#include "nan.h"

namespace node_tree_sitter_cli {
namespace rule_builder {

using namespace v8;

Nan::Persistent<v8::Function> constructor;

Local<Object> build_symbol(Local<String> name) {
  auto result = Nan::New<Object>();
  result->Set(Nan::New("type").ToLocalChecked(), Nan::New("SYMBOL").ToLocalChecked());
  result->Set(Nan::New("name").ToLocalChecked(), name);
  return result;
}

static void GetProperty(Local<String> property, const Nan::PropertyCallbackInfo<v8::Value> &info) {
  Local<Value> rules = info.This()->GetInternalField(0);
  Local<Object> symbol = build_symbol(property);

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
  Local<Value> data = Nan::Null();
  if (info.Length() == 1 && info[0]->IsObject()) {
    data = info[0];
  }
  info.This()->SetInternalField(0, data);
}

void Init(Handle<Object> exports) {
  Local<FunctionTemplate> tpl = Nan::New<FunctionTemplate>(construct);
  tpl->SetClassName(Nan::New("RuleBuilder").ToLocalChecked());
  Nan::SetNamedPropertyHandler(tpl->InstanceTemplate(), GetProperty);
  tpl->InstanceTemplate()->SetInternalFieldCount(1);
  constructor.Reset(tpl->GetFunction());
  exports->Set(Nan::New("RuleBuilder").ToLocalChecked(), Nan::New(constructor));
}

}  // namespace rule_builder
}  // namespace node_tree_sitter_cli
