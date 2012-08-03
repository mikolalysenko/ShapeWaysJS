var soap = require('./soap-fix/soap.js')
  , shapeways_url = 'http://api.shapeways.com/v1/wsdl.php';

exports.connect = function(params, cb) {

  if(  !('username' in params)
    || !('password' in params) ) {
    cb(new Error("Missing username/password"), null);
    return; 
  }
  
  function createShapeWaysClient(client, session_id, printers) {
    var result = {}
      , method_queue = []
      , connected = true;
    
    
    //Called when session accidentally dies
    function reconnect() {
      connected = false;
      var args = {
          username: params.username
        , password: params.password
      };
      if('application_id' in params) {
        args.application_id = params.application_id;
      }
      client.login(args, function(err, result) {
        if(err) {
          for(var i=0; i<method_queue.length; ++i) {
            method_queue[i](err);
          }
          return;
        }
        connected = true;
        for(var i=0; i<method_queue.length; ++i) {
          method_queue[i](null);
        }
      });
    }
    
    //Pushes a method to the queue
    function do_method(func) {
      if(connected) {
        func(null);
        return;
      } else {
        method_queue.push(func);
      }
    }
    
    result.printers = printers;
    
    //Submits a model to the server
    result.submitModel = function(model, cb) {
      var func = function(err) {
        if(err) {
          cb(err, null);
          return;
        }
        
        //Try converting the model to shapeways format
        var sw_model = convert_model(model);
        if(!sw_model) {
          cb(new Error("Invalid model"), null);
          return;
        }
        
        //Pack in arguments
        var args = { session_id: session_id };
        if('application_id' in params) {
          args.application_id = params.application_id;
        }
        args.model = sw_model;
        
        //Submit to ShapeWays
        client.submitModel(args, function(err, result) {
          if(err == "Session terminated") { //FIXME: check this properly
            reconnect();
            do_method(func);
            return;
          } else if(err) {
            cb(err, null);
            return;
          }
          cb(null, result);
        });
      });
      
      do_method(func);
    }
    
    return result;
  }
  
  soap.createClient(shapeways_url, function(err, client) {
    if(err) {
      cb(err, null);
      return;
    }
    var args = {
        username: params.username
      , password: params.password
    };
    if('application_id' in params) {
      args.application_id = params.application_id;
    }
    
    client.login(args, function(err, result) {
      if(err) {
        cb(err, null);
        return;
      }
      
      var session_id = result.loginReturn
        , args = {
            session_id: session_id
      };
      if('application_id' in params) {
        args.application_id = params.application_id;
      }
      
      client.getPrinters(args, function(err, result) {
        if(err) {
          cb(err, null);
          return;
        }
        cb(null, createShapeWaysClient(client, session_id, result.getPrintersReturn.item));
      });
    });
  });
};
