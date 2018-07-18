var fs = require('fs');
var chalk = require('chalk');
const yargs = require('yargs');
const argv = yargs
  .demand('file')
  .nargs('file', 1)
  .describe('file', 'JSON file to update')
  .nargs('category', 1)
  .describe('category', 'category to update')
  .nargs('ref', 1)
  .describe('ref', 'git reference to update')
  .nargs('smallicon', 1)
  .describe('smallicon', 'smallicon to update')
  .nargs('largeicon', 1)
  .describe('largeicon', 'largeicon to update')
  .usage('jsonUpdate [options]')
  .help('h')
  .alias('h', 'help')
  .argv;

const file = argv.file;
const category = argv.category;
const ref = argv.ref;
const smallicon = argv.smallicon;
const largeicon = argv.largeicon;

fs.readFile(file, (err, dataBuffer) => {

  //use destructuring later
  if (err) throw err;
  var obj = JSON.parse(dataBuffer);
  // obj.ref = 'git.tibco.com/git/product/ipaas/wi-plugins.git/activity/redshift/query';
  if (ref != "") {
    obj.ref = ref;
  }

  //TBD later expose these as command line args or through object destructuring
  // obj.display.smallIcon = "icons/ic-redshift.png";
  // obj.display.largeIcon = "icons/ic-redshift@2x.png"

  console.log(chalk.yellow(`Smallicon is ${smallicon} updated`));
  console.log(chalk.yellow(`Largeicon is ${largeicon} updated`))
  
  if (smallicon) {
    obj.display.smallIcon = smallicon;
  }
  if (largeicon) {
    obj.display.largeIcon = largeicon;
  }

  if (category) {
    obj.display.category = category;
  }
  fs.writeFile(
    file,
    JSON.stringify(obj, null, '\t'),
    'utf8',
    function (err, dataBuffer) {
      if (err) throw err;
      console.log(
        chalk.yellow(`JSON file ${file} updated`)
      );
    }
  );
});
