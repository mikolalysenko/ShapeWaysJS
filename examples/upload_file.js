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
      title:    'Test File'
    , model_filename: path.join(__dirname, '40mmcube.stl')
    , units:    'mm'
  }, function(err, model_id) {
  
    if(err) {
      console.log("Failed to upload STL:", err);
      return;
    }
    
    console.log("Uploaded model:", model_id);
    console.log("ShapeWays URL: http://www.shapeways.com/model/"+model_id);
  });
  
});
