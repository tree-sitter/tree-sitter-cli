{
  "targets": [
    {
      "target_name": "tree_sitter_compiler_binding",
      "dependencies": [
        "vendor/tree-sitter/project.gyp:compiler",
      ],
      "include_dirs": [
        "<!(node -e \"require('nan')\")",
      ],
      "sources": [
        "src/binding.cc",
        "src/compile.cc",
        "src/language.cc",
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
