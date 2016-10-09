#ifndef TREE_SITTER_RULE_BUILDER_H
#define TREE_SITTER_RULE_BUILDER_H

#include <v8.h>
#include "nan.h"

namespace node_tree_sitter_cli {
namespace rule_builder {

void Init(v8::Handle<v8::Object> exports);

}  // namespace rule_builder
}  // namespace node_tree_sitter_cli

#endif  // TREE_SITTER_RULE_BUILDER_H
