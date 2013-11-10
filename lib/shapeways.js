var soap = require('./soap-mod/soap.js')
  , buffer = require('buffer')
  , models = require('./models.js')
  , shapeways_url = 'http://api.shapeways.com/v1/wsdl.php';


exports.connect = function(params, cb) {
  "use strict";

  if(  !('username' in params)
    || !params.username
    || !('password' in params)
    || !params.password ) {
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
      if(!connected) {
        return;
      }
    
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
          method_queue.length = 0;
          return;
        }
        //Retrieve new session id
        session_id = result.loginReturn;
        connected = true;
        for(var i=0; i<method_queue.length; ++i) {
          method_queue[i](null);
        }
        method_queue.length = 0;
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
        } else if(args.view_state.toLowerCase() === 'hidden') {
          return 2;
        } else if(args.view_state.toLowerCase() === 'view only') {
          return 0;
        }
      }
      return 1;
    }
    
    function get_scale(args) {
      if('scale' in args) {
        return args.scale;
      }
      if('units' in args) {
        var unit_scales = {
            'mm': 0.0001
          , 'cm': 0.01
          , 'inches': 0.0254
          , 'inch': 0.0254
          , 'feet': 0.3048
          , 'foot': 0.3048
          , 'm' : 1.0
          , 'meter': 1.0
          , 'yard': 0.9144
        };
        var s = args.units.toLowerCase();
        if(s in unit_scales) {
          return unit_scales[s];
        }
      }
      return 0.01;
    }
    
    function simplifyTitle(str) {
      return str.toUpperCase().replace(/\W/g, "");
    }
    
    
    //Flatten the stupid broken SOAP cruft
    var materials = {}
      , material_ids = {};
    for(var i=0; i<printers.length; ++i) {
      var printer = printers[i];
      if('item' in printer.materials) {
        printer.materials = printer.materials.item;
      }
      if(!(printer.materials instanceof Array)) {
        printer.materials = [printer.materials];
      }
      for(var j=0; j<printer.materials.length; ++j) {
        var mat = printer.materials[j];
        if(!(mat.title in materials)) {
          mat.id = parseInt(mat.id);
          materials[simplifyTitle(mat.title)] = mat;
          material_ids[mat.id] = mat;
        }
      }
    }
    
    function getMaterialId(obj) {
      if(typeof(obj) === "string") {
        var title = simplifyTitle(obj);
        if(title in materials) {
          return materials[title].id;
        }
        //Try converting to int
        obj = parseInt(obj);
      }
      if(typeof(obj) === "number") {
        if(obj in material_ids) {
          return obj;
        }
      }
      if(typeof(obj) === "object") {
        if('id' in obj && 
            obj.id in material_ids) {
          return obj.id;
        }
      }
      return -1;
    }
    
    function flattenMaterials(mat_array) {
      if(typeof(mat_array) !== "object" || !(mat_array instanceof Array)) {
        mat_array = [ mat_array ];
      }
      
      var result = [];
      for(var i=0; i<mat_array.length; ++i) {
        var mat_id = getMaterialId(mat_array[i]);
        if(mat_id >= 0) {
          result.push(material_ids[mat_id].title);
        }
      }
      result.sort();
      
      //Remove item i from array
      for(var i=result.length-1; i>=0; --i) {
        if(result[i] === result[i+1]) {
          result.splice(i, 1);
        }
      }
      
      //Return flattened array
      return result;
    }
    
    //Returns a list of all printers matching specified constraint
    result.printers = printers;
    result.materials = materials;
    
    
    //Retrieves an estimate for the price
    result.price = function(args, cb) {
      var nargs = { session_id: session_id };
      
      if(!('volume' in args) ||
        typeof(args.volume) !== "number") {
        cb(new Error("Missing/invalid 'volume' parameter"), null);
        return;
      }
      nargs.modelVolume = args.volume;
      
      if(!('material' in args)) {
        cb(new Error("Missing 'material' parameter"), null);
        return;
      }
      var mat_id = getMaterialId(args.material);
      if(mat_id < 0) {
        cb(new Error("Invalid 'material' parameter, must be either a string, number or object"), null);
        return;
      }
      nargs.materialId = mat_id;
      
      if('application_id' in params) {
        nargs.application_id = params.application_id;
      }
      
      function do_get_price(err) {
        if(err) {
          cb(err, null);
          return;
        }
      
        client.getModelPrice(nargs, function(err, result) {
          if(err) {
            cb(err, null);
            return;
          }
          
          var cruft = result.SWModelPriceReturn
            , quote = {
                price:              parseFloat(cruft.price)
              , includes_tax:       (cruft.includes_tax === 'true')
              , includes_shipping:  (cruft.includes_shipping === 'true')
              , currency:           cruft.currency
            };
          cb(null, quote);
        });
      }
      
      do_method(do_get_price);
    };
    
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
            return;
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
            , file:         sw_model.model
            /*
            , file_uri:     ""  //Not clear if this is needed
            */
            , filename:     sw_model.filename
            , tags:         'tags' in args ? args.tags : ""
            , has_color:    sw_model.has_color
            , scale:        get_scale(args)
            , markup:       'markup' in args ? args.markup : 0
          };
          
          //Flatten material array
          if('materials' in args) {
            nargs.model.materials = flattenMaterials(args.materials);
          }
          
          //Submit to ShapeWays
          var submit_tries = 0;
          
          function retrySubmit() {
            reconnect();
            do_method(do_submit);
          }
          
          function do_submit(err) {
            if(err) {
              cb(err, null);
              return;
            }
            
            ++submit_tries;
            if(submit_tries > 5) {
              cb(new Error("Failed to upload model, rejected by ShapeWays"), null);
              return;
            }
            
            //Reset session id
            nargs.session_id = session_id;
            client.submitModel(nargs, function(err, result) {
            
              if(err) {
                cb(err, null);
                return;
              }
              
              var resp = result.response;
              if(resp === "failed") {
                //Retry upload a few times
                setTimeout(retrySubmit, 1000 << submit_tries);
                return;
              } else {
                cb(null, result.response);
              }
            }); 
          };
          do_method(do_submit);
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
      
      cb(null, createShapeWaysClient(client, session_id, []));
    });
  });
};
