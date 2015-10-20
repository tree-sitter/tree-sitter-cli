#include <node.h>
#include <uv.h>
#include <string>
#include "tree_sitter/runtime.h"
#include "nan.h"
#include <unistd.h>
#include <sys/wait.h>

using namespace v8;

namespace node_tree_sitter_compiler {

static Nan::Persistent<Function> constructor;

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

NAN_METHOD(LoadLanguage) {
  Handle<String> js_src_filename = Handle<String>::Cast(info[0]);
  Handle<String> js_language_name = Handle<String>::Cast(info[1]);
  Handle<String> js_header_dir = Handle<String>::Cast(info[2]);
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
    Nan::ThrowError(("Failed to compile C code - " + error).c_str());
    return;
  }

  error = run_cmd("gcc", (const char *[]){
    "gcc",
    "-shared",
    "-Wl", obj_filename.c_str(),
    "-o", lib_filename.c_str(),
    NULL
  });

  if (!error.empty()) {
    Nan::ThrowError(("Failed to link C code - " + error).c_str());
    return;
  }

  uv_lib_t parser_lib;
  int error_code = uv_dlopen(lib_filename.c_str(), &parser_lib);
  if (error_code) {
    std::string message(uv_dlerror(&parser_lib));
    Nan::ThrowError(("Couldn't open language file - " + message).c_str());
    return;
  }

  const TSLanguage * (* language_fn)() = NULL;
  error_code = uv_dlsym(&parser_lib, ("ts_language_" + language_name).c_str(), (void **)&language_fn);
  if (error_code) {
    std::string message(uv_dlerror(&parser_lib));
    Nan::ThrowError(("Couldn't load language function - " + message).c_str());
    return;
  }

  if (!language_fn) {
    Nan::ThrowError("Could not load language");
    return;
  }

  Local<Object> instance = Nan::New(constructor)->NewInstance();
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

}  // namespace node_tree_sitter_compiler
