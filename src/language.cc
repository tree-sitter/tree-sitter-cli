#include <node.h>
#include <uv.h>
#include <string>
#include "tree_sitter/runtime.h"
#include <unistd.h>
#include <sys/wait.h> 

using namespace v8;

namespace node_tree_sitter_compiler {

static Persistent<Function> constructor;

static std::string run_cmd(const char *cmd, const char *args[]) {
  int child_pid = fork();
  if (child_pid == 0) {
    close(0);
    dup2(1, 0);
    dup2(2, 1);
    dup2(1, 2);
    execvp(cmd, (char * const * )args);
    return "";
  } else if (child_pid > 0) {
    int status;
    waitpid(child_pid, &status, 0);
    if (WIFEXITED(status)) {
      if (WEXITSTATUS(status) == 0)
        return "";
      else
        return "command failed";
    } else {
      return "child process did not exit";
    }
  } else {
    return "fork failed";
  }
}

Handle<Value> LoadLanguage(const Arguments &args) {
  HandleScope scope;

  Handle<String> js_src_filename = Handle<String>::Cast(args[0]);
  Handle<String> js_language_name = Handle<String>::Cast(args[1]);
  Handle<String> js_header_dir = Handle<String>::Cast(args[2]);
  std::string src_filename(*String::Utf8Value(js_src_filename));
  std::string language_name(*String::Utf8Value(js_language_name));
  std::string header_dir(*String::Utf8Value(js_header_dir));
  std::string obj_filename(src_filename + ".o");
  std::string lib_filename(src_filename + ".so");

  std::string error = run_cmd("gcc", (const char *[]){
    "gcc",
    "-x", "c",
    "-fPIC",
    "-I", header_dir.c_str(),
    "-c", src_filename.c_str(),
    "-o", obj_filename.c_str(),
    NULL
  });
  if (!error.empty()) {
    ThrowException(Exception::Error(String::New(("Failed to compile C code - " + error).c_str())));
    return scope.Close(Undefined());
  }

  error = run_cmd("gcc", (const char *[]){
    "gcc",
    "-shared",
    "-Wl", obj_filename.c_str(),
    "-o", lib_filename.c_str(),
    NULL
  });
  if (!error.empty()) {
    ThrowException(Exception::Error(String::New(("Failed to link C code" + error).c_str())));
    return scope.Close(Undefined());
  }

  uv_lib_t parser_lib;
  int error_code = uv_dlopen(lib_filename.c_str(), &parser_lib);
  if (error_code) {
    Handle<String> message = String::New(uv_dlerror(&parser_lib));
    ThrowException(Exception::Error(
        String::Concat(String::New("Couldn't open language file - "), message)));
    return scope.Close(Undefined());
  }

  const TSLanguage * (* language_fn)() = NULL;
  error_code = uv_dlsym(&parser_lib, (std::string("ts_language_") + language_name).c_str(), (void **)&language_fn);
  if (error_code) {
    Handle<String> message = String::New(uv_dlerror(&parser_lib));
    ThrowException(Exception::Error(
        String::Concat(String::New("Couldn't load language - "), message)));
    return scope.Close(Undefined());
  }

  if (!language_fn) {
    ThrowException(Exception::Error(String::New("Could not load language")));
    return scope.Close(Undefined());
  }

  Local<Object> instance = constructor->NewInstance();
  instance->SetInternalField(0, External::New((void *)language_fn()));
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
