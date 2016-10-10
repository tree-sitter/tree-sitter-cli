const tmp = require("temp"),
      spawnSync = require("child_process").spawnSync,
      fs = require("fs"),
      path = require("path"),
      binding = require("./binding");

const INCLUDE_PATH = path.join(__dirname, '..', '..', 'vendor', 'tree-sitter', 'include')

function loadLanguage(code) {
  const srcPath = tmp.openSync().path;
  const objectPath = srcPath + ".o";
  const libPath = srcPath + ".so";
  const ccCommand = process.env['CC'] || 'gcc';

  fs.writeFileSync(srcPath, code);
  const compileResult = spawnSync(ccCommand, [
    "-x", "c",
    "-fPIC",
    "-I", INCLUDE_PATH,
    "-c", srcPath,
    "-o", objectPath
  ], {
    encoding: 'utf8'
  });

  if (compileResult.error) {
    throw compileResult.error;
  }

  if (compileResult.status !== 0) {
    throw new Error("Compiling parser failed: " + compileResult.stderr);
  }

  const linkResult = spawnSync(ccCommand, [
    "-shared",
    "-o", libPath,
    objectPath,
  ]);

  if (linkResult.error) {
    throw linkResult.error;
  }

  if (linkResult.status !== 0) {
    throw new Error("Building parser library failed: " + linkResult.stderr);
  }

  const languageFunctionName = code.match(/ts_language_(\w+)/)[0];
  return binding.loadLanguage(libPath, languageFunctionName);
}

function generate(grammar) {
  return binding.generate(JSON.stringify(grammar))
}

module.exports = {
  generate: generate,
  loadLanguage: loadLanguage,
  dsl: require("./dsl"),
};
