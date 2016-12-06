const tmp = require("temp"),
      spawnSync = require("child_process").spawnSync,
      fs = require("fs"),
      path = require("path"),
      binding = require("./binding");

const INCLUDE_PATH = path.join(__dirname, '..', '..', 'vendor', 'tree-sitter', 'include')

function loadLanguage(code, otherSourceFiles = []) {
  const srcPath = tmp.openSync().path;
  const libPath = srcPath + ".so";
  const ccCommand = process.env['CC'] || 'gcc';

  fs.writeFileSync(srcPath, code);
  const compileResult = spawnSync(ccCommand, [
    "-shared",
    "-x", "c",
    "-fPIC",
    "-g",
    "-I", INCLUDE_PATH,
    "-o", libPath,
    srcPath,
    ...otherSourceFiles
  ], {
    encoding: 'utf8'
  });

  if (compileResult.error) {
    throw compileResult.error;
  }

  if (compileResult.status !== 0) {
    throw new Error("Compiling parser failed: " + compileResult.stderr);
  }

  const languageFunctionName = code.match(/(ts_language_\w+)\(\) {/)[1];
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
