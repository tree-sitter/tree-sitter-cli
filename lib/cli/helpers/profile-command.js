const fs = require("fs")
const temp = require("temp")
const {spawn} = require('child_process')
const {generateFlameGraphForCommand} = require('@maxbrunsfeld/flame-graph')

module.exports =
async function profileCommand (command, containingFunctionName, callback) {
  const html = await generateFlameGraphForCommand(command, {
    functionNames: containingFunctionName,
    fullPage: true
  })

  const flamegraphFile = temp.openSync({prefix: 'flamegraph', suffix: '.html'})
  fs.chmodSync(flamegraphFile.path, '755')
  fs.writeSync(flamegraphFile.fd, html, 'utf8')

  spawn('open', [flamegraphFile.path])
  callback()
}
