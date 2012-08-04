var shapeways = require('./index.js');

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
  
  /*
  sw.upload({
      title:    'Test Model'
    , filename: './test/40mmcube.stl'
    , units:    'mm'
  }, function(err, model_id) {
  
    if(err) {
      console.log(err);
      return;
    }
    
    console.log("Uploaded model:", model_id);
  });
  */
  
  sw.upload({
      title: 'Test JSON'
    , units: 'cm'
    , json_model: {
        verts: [ 
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
              [0, 1, 3, 2]
            , [0, 1, 5, 4]
            , [0, 2, 6, 4]
            , [1, 3, 7, 5]
            , [2, 3, 7, 6]
            , [4, 5, 7, 6] 
        ]
    }
  }, function(err, model_id) {
    console.log("Uploaded model: " + model_id);
  });
});
