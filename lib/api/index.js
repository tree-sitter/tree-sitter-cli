const fs = require("fs");
const path = require("path");
const tmp = require("temp");
const {spawnSync} = require("child_process");
const binding = require("./binding");
const properties = require('./properties');
const dsl = require("./dsl");

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
  return binding.generateParserCode(JSON.stringify(grammar), logToStderr);
}

function generatePropertyJSON(css, baseDirectory, logToStderr) {
  const parsedProperties = properties.parseProperties(css, baseDirectory);
  for (const rule of parsedProperties) {
    for (const key in rule.properties) {
      rule.properties[key] = JSON.stringify(rule.properties[key]);
    }
  }
  const stateMachineJSON = binding.generatePropertyJSON(JSON.stringify(parsedProperties), logToStderr);
  const stateMachine = JSON.parse(stateMachineJSON);
  for (const propertySet of stateMachine.property_sets) {
    for (const key in propertySet) {
      propertySet[key] = JSON.parse(propertySet[key]);
    }
  }
  return JSON.stringify(stateMachine, null, 2);
}

module.exports = {
  generate,
  generatePropertyJSON,
  loadLanguage,
  dsl,
  parseProperties: properties.parseProperties,
  queryProperties: properties.queryProperties
};
