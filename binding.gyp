{
  "targets": [
    {
      "target_name": "tree_sitter_cli_binding",
      "dependencies": [
        "vendor/tree-sitter/project.gyp:compiler",
      ],
      "include_dirs": [
        "<!(node -e \"require('nan')\")",
      ],
      "sources": [
        "src/binding.cc",
        "src/generate.cc",
        "src/language.cc",
        "src/rule_builder.cc",
      ],
      'conditions': [
        ['OS == "mac"', {
          'xcode_settings': {
            'MACOSX_DEPLOYMENT_TARGET': '10.7',
          },
        }]
      ],
      "cflags": [
        "-std=c++0x",
      ],
      'xcode_settings': {
        'CLANG_CXX_LANGUAGE_STANDARD': 'c++11',
      },
    },
  ],
}
