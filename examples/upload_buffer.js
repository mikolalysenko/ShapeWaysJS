//Basically the same as upload_file, except it reads the file into a buffer first

var shapeways = require('../index.js')
  , path = require('path')
  , fs = require('fs');

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
  
  fs.readFile(path.join(__dirname, '40mmcube.stl'), function(err, data) {
    if(err) {
      console.log(err);
      return;
    }
    
    sw.upload({
        title:    'Test Buffer'
      , model_buffer: data
      , model_type: 'STL'
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
});
