module.exports = function generate(options, callback) {
  const api = require("../api");
  const fs = require("fs-extra");
  const path = require("path");
  const mkdirp = require("mkdirp");
  const templates = require("./templates");
  const cwd = process.cwd();
  const profileCommand = require('./helpers/profile-command');

  if (options.profile) {
    options.profile = false;
    profileCommand(invokeSelfCommand(options).join(' '), 'ts_compile_grammar', callback);
    return;
  }

  for (const key in api.dsl) {
    global[key] = api.dsl[key];
  }

  let grammar
  if (fs.existsSync(path.join(cwd, 'grammar.json'))) {
    const grammarString = fs.readFileSync(path.join(cwd, 'grammar.json'), 'utf8')
    grammar = eval('(' + grammarString + ')')
  } else {
    grammar = require(path.join(cwd, "grammar"));
  }

  let code;
  try {
    code = api.generate(grammar, options.debug);
  } catch (e) {
    if (e.isGrammarError) {
      console.warn("Error: " + e.message);
      return callback(1);
    } else {
      throw e;
    }
  }

  const srcPath = path.join(cwd, 'src');
  const grammarJSONPath = path.join(srcPath, 'grammar.json');
  const parserPath = path.join(srcPath, 'parser.c');
  const bindingCCPath = path.join(srcPath, 'binding.cc');
  const bindingGypPath = path.join(cwd, 'binding.gyp');
  const indexJSPath = path.join(cwd, 'index.js');

  mkdirp.sync(srcPath);
  mkdirp.sync(path.join(srcPath, "tree_sitter"));

  const headerPath = path.join(__dirname, "..", "..", "vendor", "tree-sitter", "include", "tree_sitter");
  fs.copySync(path.join(headerPath, "parser.h"), path.join(srcPath, "tree_sitter", "parser.h"));

  fs.writeFileSync(grammarJSONPath, JSON.stringify(grammar, null, 2));
  fs.writeFileSync(parserPath, code);

  if (!fs.existsSync(bindingCCPath)) {
    fs.writeFileSync(bindingCCPath, templates.bindingCC(grammar.name));
  }

  if (!fs.existsSync(bindingGypPath)) {
    fs.writeFileSync(bindingGypPath, templates.bindingGyp(grammar.name));
  }

  if (!fs.existsSync(indexJSPath)) {
    fs.writeFileSync(indexJSPath, templates.indexJS(grammar.name));
  }

  callback(0);
};

function invokeSelfCommand(options) {
  return [
    process.argv[0],
    "-e",
    "require('" + __filename + "')(" + JSON.stringify(options) + ",process.exit);"
  ];
}
