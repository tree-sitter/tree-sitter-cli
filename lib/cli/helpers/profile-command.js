const fs = require('fs');
const path = require('path')
const temp = require("temp");
const spawn = require("child_process").spawn;
const rootPath = path.join(__dirname, '..', '..', '..')

module.exports =
function profileCommand (command, containingFunctionName, callback) {
  const dtraceOutputFile = temp.openSync({prefix: 'dtrace.out'});
  const flamegraphFile = temp.openSync({prefix: 'flamegraph', suffix: '.html'});
  fs.chmodSync(flamegraphFile.path, '755');

  const dtraceProcess = spawn("dtrace", [
    "-x", "ustackframes=100",
    "-n", "profile-2000 /pid == $target/ { @num[ustack()] = count(); }",
    "-c", command
  ], {
    stdio: ['ignore', dtraceOutputFile.fd, process.stderr]
  });

  dtraceProcess.on('close', function(code) {
    if (code !== 0) {
      return callback(code);
    }

    fs.closeSync(dtraceOutputFile.fd);
    const dtraceOutput = fs.readFileSync(dtraceOutputFile.path, 'utf8');
    const dtraceStacks = dtraceOutput.split("\n\n");
    const filteredStacks = dtraceStacks
      .map((stack) => {
        const lines = stack.split('\n');
        const matchingLine = lines.findIndex(line => line.includes(containingFunctionName));
        if (matchingLine !== -1) {
          return lines
            .slice(0, matchingLine + 1)
            .join('\n')
            + '\n'
            + lines[lines.length - 1]
        } else {
          return null;
        }
      })
      .filter((stack) => !!stack)
    const filteredOutput = filteredStacks.join('\n\n');

    const stackvisProcess = spawn(path.join(rootPath, 'node_modules', '.bin', 'stackvis'), [], {
      stdio: ['pipe', flamegraphFile.fd, process.stderr]
    });
    stackvisProcess.stdin.write(filteredOutput);
    stackvisProcess.stdin.end();

    stackvisProcess.on('close', function(code) {
      if (code !== 0) {
        return callback(code);
      }

      console.log("Opening", flamegraphFile.path);
      spawn('open', [flamegraphFile.path]);
      callback(0);
    });
  });
}
