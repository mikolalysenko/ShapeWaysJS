var shapeways = require('../index.js')
  , path = require('path');

if(process.argv.length !== 6) {
  console.log("Please specify [username], [password], [volume] and [material] as commandline arguments.");
  process.exit(1);
}

var volume = parseFloat(process.argv[4])
  , material = process.argv[5];


shapeways.connect({
    username:  process.argv[2]
  , password:  process.argv[3]
}, function(err, sw) {

  if(err) {
    console.log(err);
    return;
  }
  
  sw.price({
      volume:   volume
    , material: material
  }, function(err, result) {
    if(err) {
      console.log(err);
      return;
    }
    console.log("Price Quote:", result);
  });
});
