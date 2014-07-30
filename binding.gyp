{
  "targets": [
    {
      "target_name": "tree_sitter_compiler_binding",
      "dependencies": [
        "vendor/tree-sitter/project.gyp:compiler",
      ],
      "sources": [
        "src/binding.cc",
        "src/compile.cc",
        "src/parser.cc",
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
