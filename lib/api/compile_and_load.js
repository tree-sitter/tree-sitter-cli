var tmp = require("temp"),
    fs = require("fs"),
    path = require("path"),
    sh = require("execSync"),
    binding = require("./binding");

var rootDir = path.join(__dirname, "..", ".."),
    headerDir = path.join(rootDir, "vendor", "tree-sitter", "include"),
    runtimeLibPath = path.join(rootDir, "node_modules", "tree-sitter", "build", "Release", "runtime.a");

module.exports = function compileAndLoad(grammar) {
  var code = binding.compile(grammar),
      srcFile = tmp.openSync(),
      srcPath = srcFile.path,
      objPath = srcPath + ".o",
      libPath = srcPath + ".so";

  fs.writeFileSync(srcPath, code);

  var status = sh.run("gcc -x c -fPIC -I " + headerDir + " -c " + srcPath + " -o " + objPath);
  if (status != 0)
    throw new Error("failed to compile C code");

  status = sh.run("gcc -shared -Wl " + objPath + " " + runtimeLibPath + " -o " + libPath);
  if (status != 0)
    throw new Error("failed to link C code");

  return binding.loadParser(libPath, grammar.name);
}
