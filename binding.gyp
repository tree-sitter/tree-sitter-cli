{
  "targets": [
    {
      "target_name": "tree_sitter_compiler_binding",
      "dependencies": [
        "vendor/tree-sitter/project.gyp:compiler",
      ],
      "include_dirs": [
        "node_modules/tree-sitter/include",
      ],
      "sources": [
        "src/binding.cc",
        "src/compile.cc",
        "src/load_parser.cc",
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
