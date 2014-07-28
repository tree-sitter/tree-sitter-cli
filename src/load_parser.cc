#include <node.h>
#include <uv.h>
#include "tree_sitter/runtime.h"
#include "node_tree_sitter/parser.h"
#include <string>

using namespace v8;

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

  return scope.Close(Parser::NewInstance(parser_constructor()));
}
