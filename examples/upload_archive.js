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
  
  sw.upload({
      title:    'Test Archive'
    , model_filename: path.join(__dirname, 'test_archive.zip')
    , units:    'cm'
    , has_color: true
  }, function(err, model_id) {
  
    if(err) {
      console.log("Failed to upload archive:", err);
      return;
    }
    
    console.log("Uploaded model:", model_id);
    console.log("ShapeWays URL: http://www.shapeways.com/model/"+model_id);
  });
  
});
