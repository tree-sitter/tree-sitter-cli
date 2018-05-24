const fs = require("fs");
const path = require("path");
const tmp = require("temp");
const {spawnSync} = require("child_process");

const INCLUDE_PATH = path.join(__dirname, '..', '..', 'vendor', 'tree-sitter', 'include')

function loadLanguage(code, otherSourceFiles = []) {
  const {path: srcPath, fd} = tmp.openSync({suffix: '.c'});
  fs.closeSync(fd);
  fs.writeFileSync(srcPath, code);

  let compileResult, libPath
  if (process.platform === 'win32') {
    libPath = srcPath + ".dll";
    compileResult = spawnSync('cl.exe', [
      "/nologo",
      "/LD",
      "/I", INCLUDE_PATH,
      "/Od",
      srcPath,
      ...otherSourceFiles,
      "/link",
      "/out:" + libPath
    ], {
      encoding: 'utf8'
    });
  } else {
    libPath = srcPath + ".so";
    compileResult = spawnSync(process.env['CC'] || 'gcc', [
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
  }

  if (compileResult.error) {
    throw compileResult.error;
  }

  if (compileResult.status !== 0) {
    throw new Error("Compiling parser failed:\n" + compileResult.stdout + "\n" + compileResult.stderr);
  }

  const languageFunctionName = code.match(/(tree_sitter_\w+)\(\) {/)[1];
  return require("./binding").loadLanguage(libPath, languageFunctionName);
}

function generate(grammar, logToStderr) {
  return require("./binding").generate(JSON.stringify(grammar), logToStderr)
}

module.exports = {
  generate: generate,
  loadLanguage: loadLanguage,
  dsl: require("./dsl"),
};
