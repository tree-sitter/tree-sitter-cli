#include "./rule_builder.h"
#include <v8.h>
#include <string>
#include "nan.h"

namespace node_tree_sitter_compiler {
namespace rule_builder {

using namespace v8;

v8::Persistent<v8::Function> constructor;
v8::Persistent<v8::Function> symbol_fn;

static NAN_METHOD(New) {
  NanScope();
  NanReturnValue(args.This());
}

NAN_PROPERTY_GETTER(GetProperty) {
  NanScope();
  Local<Object> builder = args.This();
  Local<Object> rules = Local<Object>::Cast(args.Data());

  if (!rules->IsObject())
    NanThrowError("This should not happend");

  if (!rules->HasRealNamedProperty(property)) {
    NanUtf8String property_name(property);
    NanReturnValue(NanTypeError((std::string("Undefined rule '") + *property_name + "'").c_str()));
  }

  Handle<Value> argv[1] = { property };
  NanReturnValue(NanNew(symbol_fn)->Call(builder, 1, argv));
}

static NAN_METHOD(Build) {
  NanScope();

  if (args.Length() != 1 || !args[0]->IsObject())
    NanThrowTypeError("A rule hash must be supplied");

  Local<FunctionTemplate> tpl = NanNew<FunctionTemplate>(New);
  tpl->SetClassName(NanNew<String>("RuleBuilder"));
  tpl->InstanceTemplate()->SetNamedPropertyHandler(GetProperty, 0, 0, 0, 0, args[0]);
  NanReturnValue(tpl->GetFunction()->NewInstance());
}

static NAN_METHOD(Setup) {
  NanScope();
  NanAssignPersistent(symbol_fn, Handle<Function>::Cast(args[0]));
  NanReturnValue(NanNew<FunctionTemplate>(Build)->GetFunction());
}

void Init(Handle<Object> exports) {
  exports->Set(NanNew("setupRuleBuilder"), NanNew<FunctionTemplate>(Setup)->GetFunction());
}

}  // namespace rule_builder
}  // namespace node_tree_sitter_compiler
