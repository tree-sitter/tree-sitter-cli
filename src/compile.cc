#include "./compile.h"
#include "tree_sitter/compiler.h"
#include <utility>
#include <vector>

namespace node_tree_sitter_compiler {

using namespace v8;
using namespace tree_sitter;
using std::string;
using std::get;
using std::pair;
using std::vector;

static std::string StringFromJsString(Local<String> js_string) {
  String::Utf8Value utf8_string(js_string);
  return std::string(*utf8_string);
}

template<typename T>
Local<T> ObjectGet(Local<Object> object, const char *key) {
  return Local<T>::Cast(object->Get(Nan::New(key).ToLocalChecked()));
}

template<typename T>
Local<T> ArrayGet(Local<Array> array, uint32_t i) {
  return Local<T>::Cast(array->Get(i));
}

rule_ptr RuleFromJsRule(Local<Object> js_rule) {
  if (!js_rule->IsObject()) {
    Nan::ThrowTypeError("Expected rule to be an object");
    return rule_ptr();
  }

  Local<String> js_type = ObjectGet<String>(js_rule, "type");
  if (!js_type->IsString()) {
    Nan::ThrowTypeError("Expected rule type to be a string");
    return rule_ptr();
  }

  string type = StringFromJsString(js_type);
  if (type == "BLANK")
    return blank();

  if (type == "CHOICE") {
    Local<Array> js_members = ObjectGet<Array>(js_rule, "members");
    vector<rule_ptr> members;
    uint32_t length = js_members->Length();
    for (uint32_t i = 0; i < length; i++) {
      Local<Object> js_member = ArrayGet<Object>(js_members, i);
      rule_ptr member = RuleFromJsRule(js_member);
      if (member.get())
        members.push_back(member);
      else
        return rule_ptr();
    }
    return choice(members);
  }

  if (type == "ERROR")
    return err(RuleFromJsRule(ObjectGet<Object>(js_rule, "value")));

  if (type == "PATTERN")
    return pattern(StringFromJsString(ObjectGet<String>(js_rule, "value")));

  if (type == "REPEAT")
    return repeat(RuleFromJsRule(ObjectGet<Object>(js_rule, "value")));

  if (type == "REPEAT1")
    return repeat1(RuleFromJsRule(ObjectGet<Object>(js_rule, "value")));

  if (type == "SEQ") {
    Local<Array> js_members = ObjectGet<Array>(js_rule, "members");
    vector<rule_ptr> members;
    uint32_t length = js_members->Length();
    for (uint32_t i = 0; i < length; i++) {
      Local<Object> js_member = ArrayGet<Object>(js_members, i);
      rule_ptr member = RuleFromJsRule(js_member);
      if (member.get())
        members.push_back(member);
      else
        return rule_ptr();
    }
    return seq(members);
  }

  if (type == "STRING")
    return str(StringFromJsString(ObjectGet<String>(js_rule, "value")));

  if (type == "PREC") {
    rule_ptr rule = RuleFromJsRule(ObjectGet<Object>(js_rule, "rule"));
    if (rule.get())
      return prec(ObjectGet<Integer>(js_rule, "value")->IntegerValue(), rule);
    else
      return rule_ptr();
  }

  if (type == "PREC_LEFT") {
    rule_ptr rule = RuleFromJsRule(ObjectGet<Object>(js_rule, "rule"));
    if (rule.get())
      return prec_left(ObjectGet<Integer>(js_rule, "value")->IntegerValue(), rule);
    else
      return rule_ptr();
  }

  if (type == "PREC_RIGHT") {
    rule_ptr rule = RuleFromJsRule(ObjectGet<Object>(js_rule, "rule"));
    if (rule.get())
      return prec_right(ObjectGet<Integer>(js_rule, "value")->IntegerValue(), rule);
    else
      return rule_ptr();
  }

  if (type == "TOKEN") {
    rule_ptr value = RuleFromJsRule(ObjectGet<Object>(js_rule, "value"));
    if (value.get())
      return token(value);
    else
      return rule_ptr();
  }

  if (type == "SYMBOL")
    return sym(StringFromJsString(ObjectGet<String>(js_rule, "name")));

  Nan::ThrowError((string("Unexpected rule type: ") + type).c_str());
  return rule_ptr();
}

pair<Grammar, bool> GrammarFromJsGrammar(Local<Object> js_grammar) {
  Local<Object> js_rules = ObjectGet<Object>(js_grammar, "rules");
  if (!js_rules->IsObject()) {
    Nan::ThrowTypeError("Expected rules to be an object");
    return { Grammar({}), false };
  }

  vector<pair<string, rule_ptr>> rules;
  Local<Array> rule_names = js_rules->GetOwnPropertyNames();
  uint32_t length = rule_names->Length();
  for (uint32_t i = 0; i < length; i++) {
    Local<String> js_rule_name = Local<String>::Cast(rule_names->Get(i));
    string rule_name = StringFromJsString(js_rule_name);
    rule_ptr rule = RuleFromJsRule(Local<Object>::Cast(js_rules->Get(js_rule_name)));
    if (rule.get()) {
      rules.push_back({ rule_name, rule });
    } else {
      return { Grammar({}), false };
    }
  }

  Grammar result(rules);

  Local<Array> js_ubiquitous_tokens = ObjectGet<Array>(js_grammar, "ubiquitous");
  if (!js_ubiquitous_tokens->IsUndefined()) {
    if (!js_ubiquitous_tokens->IsArray()) {
      Nan::ThrowTypeError("Expected ubiquitous_tokens to be an array");
      return { Grammar({}), false };
    }

    vector<rule_ptr> ubiquitous_tokens;
    for (uint32_t i = 0, length = js_ubiquitous_tokens->Length(); i < length; i++)
      ubiquitous_tokens.push_back(RuleFromJsRule(ArrayGet<Object>(js_ubiquitous_tokens, i)));

    result.ubiquitous_tokens(ubiquitous_tokens);
  }

  Local<Array> js_expected_conflicts = ObjectGet<Array>(js_grammar, "expectedConflicts");
  if (!js_expected_conflicts->IsUndefined()) {
    if (!js_expected_conflicts->IsArray()) {
      Nan::ThrowTypeError("Expected expectedConflicts to be an array");
      return { Grammar({}), false };
    }

    vector<vector<string>> expected_conflicts;
    for (uint32_t i = 0, length = js_expected_conflicts->Length(); i < length; i++) {
      vector<string> conflict_set;
      Local<Array> js_conflict_set = ArrayGet<Array>(js_expected_conflicts, i);
      if (!js_conflict_set->IsArray()) {
        Nan::ThrowTypeError("Expected each expectedConflicts entry to be an array");
        return { Grammar({}), false };
      }

      for (uint32_t j = 0, conflict_set_length = js_conflict_set->Length(); j < conflict_set_length; j++) {
        Local<String> conflict_symbol_name = ArrayGet<String>(js_conflict_set, j);
        if (!conflict_symbol_name->IsString()) {
          Nan::ThrowTypeError("Expected each item within each expectedConflicts entry to be a string");
          return { Grammar({}), false };
        }
        conflict_set.push_back(StringFromJsString(conflict_symbol_name));
      }

      expected_conflicts.push_back(conflict_set);
    }

    result.expected_conflicts(expected_conflicts);
  }


  return { result, true };
}

NAN_METHOD(Compile) {
  Local<Object> js_grammar = Local<Object>::Cast(info[0]);
  if (!js_grammar->IsObject()) {
    Nan::ThrowTypeError("Expected grammar to be an object");
    return;
  }

  Local<String> js_name = ObjectGet<String>(js_grammar, "name");
  if (!js_name->IsString()) {
    Nan::ThrowTypeError("Expected grammar name to be a string");
    return;
  }

  string name = StringFromJsString(js_name);

  pair<Grammar, bool> grammarResult = GrammarFromJsGrammar(js_grammar);
  if (!grammarResult.second) {
    return;
  }

  pair<string, const GrammarError *> result = tree_sitter::compile(grammarResult.first, name);
  if (result.second) {
    Local<Value> error = Nan::Error(result.second->message.c_str());
    Local<Object>::Cast(error)->Set(Nan::New("isGrammarError").ToLocalChecked(), Nan::True());
    Nan::ThrowError(error);
    return;
  }

  info.GetReturnValue().Set(Nan::New(result.first).ToLocalChecked());
}

}  // namespace node_tree_sitter_compiler
