var shapeways = require('./index.js');
  
shapeways.connect({
    username: process.argv[2]
  , password: process.argv[3]
  , application_id: 'Test Application'
}, function(err, client) {

  if(err) {
    console.log(err);
    return;
  }
  
  
  
  
  console.log(client.printers);
});



require('shapeways').connect({
    username:  'Your Shapeways Username'
  , password:  'Your Shapeways Password'
}, function(err, sw) {

  if(err) {
    console.log(err);
    return;
  }

  console.log("Printers:", sw.printers);
  console.log("Materials:", sw.materials);
  
  sw.submitModel({
      title:    'Test Model'
    , filename: 'test_model.stl'
  }, function(err, model_id) {
  
    if(err) {
      console.log(err);
      return;
    }
    
    console.log("Uploaded model:", model_id);
  })
  
});
