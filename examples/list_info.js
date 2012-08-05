var shapeways = require('../index.js')
  , path = require('path');

if(process.argv.length !== 4) {
  console.log("Please specify your [username] and [password] as commandline arguments.");
  process.exit(1);
}

shapeways.connect({
    username:  process.argv[2]
  , password:  process.argv[3]
}, function(err, sw) {

  if(err) {
    console.log(err);
    return;
  }
  
  console.log("Printers:", sw.printers);
  console.log("Materials:", sw.materials);
});
