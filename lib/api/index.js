const tmp = require("temp").track(),
      spawnSync = require("child_process").spawnSync,
      fs = require("fs"),
      path = require("path"),
      binding = require("./binding");
      includePath = require("./include_path")

function loadLanguage(code) {
  const srcPath = tmp.openSync().path;
  const objectPath = srcPath + ".o";
  const libPath = srcPath + ".so";
  const ccCommand = process.env['CC'] || 'gcc';

  fs.writeFileSync(srcPath, code);
  const compileResult = spawnSync(ccCommand, [
    "-x", "c",
    "-fPIC",
    "-I", includePath,
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

function compile(grammar) {
  return binding.compile(JSON.stringify(grammar))
}

module.exports = {
  compile: compile,
  loadLanguage: loadLanguage,
  includePath: includePath,
  dsl: require("./dsl"),
};
