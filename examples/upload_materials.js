//This is a modification of upload_textured showing how to specify material types

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
      title: 'Test Textured Cube'
    , units: 'cm'
    , model_json: {
        face_uvs: [
              [[0,0], [0,1], [1,1], [1,0]]
            , [[0,0], [0,1], [1,1], [1,0]]
            , [[0,0], [0,1], [1,1], [1,0]]
            , [[0,0], [0,1], [1,1], [1,0]]
            , [[0,0], [0,1], [1,1], [1,0]]
            , [[0,0], [0,1], [1,1], [1,0]]
        ]
      , verts: [ 
              [0, 0, 0]
            , [1, 0, 0]
            , [0, 1, 0]
            , [1, 1, 0]
            , [0, 0, 1]
            , [1, 0, 1]
            , [0, 1, 1]
            , [1, 1, 1] 
        ]
      , faces: [
              [3, 1, 0, 2]
            , [0, 1, 5, 4]
            , [6, 2, 0, 4]
            , [1, 3, 7, 5]
            , [7, 3, 2, 6]
            , [4, 5, 7, 6] 
        ]
    }
    , texture_filename: 'lena.jpg'
    , materials: [ "Full Color Sandstone" ]
  }, function(err, model_id) {
    if(err) {
      console.log("Failed to upload JSON:", err);
      return;
    }
    console.log("Uploaded model: " + model_id);
    console.log("ShapeWays URL: http://www.shapeways.com/model/"+model_id);
  });
});
