var soap = require('./soap-mod/soap.js')
  , fs = require('fs')
  , zlib = require('zlib')
  , buffer = require('buffer')
  , models = require('./models.js')
  , shapeways_url = 'http://api.shapeways.com/v1/wsdl.php';


exports.connect = function(params, cb) {

  if(  !('username' in params)
    || !('password' in params) ) {
    cb(new Error("Missing username/password"), null);
    return; 
  }
  
  //Create http server
  var server;
  if('server' in params) {
    server = params.server;
  } else {
    //Try creating an http server
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
    
    //Reads out view state
    function get_view_state(args) {
      if('hidden' in args) {
        return 2;
      } else if('view_only' in args) {
        return 0;
      } else if('view_state' in args) {
        if(typeof(args.view_state) === 'integer') {
          return args.view_state;
        } else if(args.view_state === 'hidden') {
          return 2;
        } else if(args.view_state === 'view only') {
          return 0;
        }
      }
      return 1;
    }
    
    //Flatten the stupid SOAP cruft
    for(var i=0; i<printers.length; ++i) {
      var printer = printers[i];
      printer.materials = printer.materials.item;
    }
    
    //Returns a list of all printers matching specified constraint
    result.printers = printers;
    
    //Submits a model to the server
    result.upload = function(args, cb) {
      var func = function(err) {
        if(err) {
          cb(err, null);
          return;
        }
        
        //Try converting the model to shapeways format
        models.read_model(args, function(err, sw_model) {
          //Pass error to client
          if(err) {
            cb(err, null);
          }
          
          //Pack in arguments
          var nargs = { session_id: session_id };
          if('application_id' in params) {
            nargs.application_id = params.application_id;
          }
          nargs.model = {
              title:        'title' in args ? args.title : "Unnamed Model - " + (new Date()).toString()
            , desc:         'desc' in args ? args.desc : ""
            , modeltype:    sw_model.modeltype
            , view_state:   get_view_state(args)
            , file:         sw_model.file
            , file_uri:     sw_model.file_uri
            , filename:     sw_model.filename
            , tags:         'tags' in args ? args.tags : ""
            , has_color:    sw_model.has_color
            , scale:        sw_model.scale
            , markup:       'markup' in args ? args.markup : 0
          }
          
          //Submit to ShapeWays
          client.submitModel(nargs, function(err, result) {
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
      };
      
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
