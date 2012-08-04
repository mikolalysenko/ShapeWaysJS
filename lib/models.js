var fs = require('fs')
  , zlib = require('zlib')
  , Buffer = require('buffer').Buffer;
  
var model_types = {
    'VRML': { color: true, type: 'VRML' }
  , 'WRL': { color: true, type: 'VRML' }
  , 'STL': { color: false, type: 'STL' }
  , 'X3D': { color: true, type: 'X3D' }
  , 'X3DB': { color: true, type: 'X3DB' }
  , 'X3DV': { color: true, type: 'X3DV' }
  , 'DAE': { color: false, type: 'DAE' }
  , 'ZIP': { color: true, type: 'ZIP' }
};


//Converts simple json formatted model to vrml2 for upload to shapeways
function json2vrml2(model) {
  "use strict";
  
  var buffer = [];
  
  //Write header  
  buffer.push([
      "# VRML V2.0 utf8"
    , ""
    , 'NavigationInfo {'
    , '\ttype [ "EXAMINE", "ANY" ]'
    , '}'
    , "Transform {"
    , "\tscale 1 1 1"
    , "\ttranslation 0 0 0"
    , "\tchildren"
    , "\t["
    , "\t\tShape"
    , "\t\t{"
    , "\t\t\tgeometry IndexedFaceSet"
    , "\t\t\t{"
    , "\t\t\t\tcreaseAngle .5"
    , "\t\t\t\tsolid true"
    , "\t\t\t\tcoord Coordinate"
    , "\t\t\t\t{"
    , "\t\t\t\t\tpoint"
    , "\t\t\t\t\t[\n"
    ].join('\n'));
    
  
  //Write vertices  
  for(var i=0; i<model.verts.length; ++i) {
    buffer.push(['\t\t\t\t\t\t', model.verts[i].join(' '), ',\n'].join(''));
  }
  buffer.push([
      "\t\t\t\t\t]"
    , "\t\t\t\t}"
    , "\t\t\t\tcoordIndex"
    , "\t\t\t\t[\n"].join('\n'));
  
  
  //Write faces
  for(var i=0; i<model.faces.length; ++i) {
    buffer.push(['\t\t\t\t\t', model.faces[i].join(', '), ', -1,\n'].join(''));
  }
  
  buffer.push([
      "\t\t\t\t]"
    , "\t\t\t}"
    , "\t\t}"
    , "\t]"
    , "}"
    ].join('\n'));
  
  
  var formatted = buffer.join('');
  console.log(formatted);
  var buf_str = (new Buffer(formatted)).toString('base64');
  console.log(buf_str);
  
  return buf_str;
}


exports.read_model = function(args, cb) {
  if('json_model' in args) {
  
    //Convert JSON mesh into x3d
    var model = args.json_model;
    cb(null, {
        modeltype: 'VRML'
      , model: json2vrml2(model)
      , filename: (new Date()).toString() + '.wrl'
      , has_color: ('face_colors' in model) ? true : false
    });
    
  } else if('filename' in args) {
    var filename = args.filename
      , toks = filename.split('.')
      , extension = toks[toks.length - 1]
      , type = ('modeltype' in args ? args.modeltype : extension).toUpperCase();
    if(!type in model_types) {
      cb(new Error("Bad model type"), null);
      return;
    }
    var mtype = model_types[type]
      , has_color = mtype.color && (('has_color' in args) ? args.has_color : false);
    fs.readFile(filename, 'base64', function(err, data) {
      if(err) {
        cb(err, null);
        return;
      }
      cb(null, {
          modeltype: mtype.type
        , model: data
        , filename: filename
        , has_color: has_color
      });
    });
  } else if('model_buffer' in args) {
    //Used to send a raw buffer to the server
    cb(null, {
        modeltype: args.modeltype
      , model: args.model_buffer
      , filename: (new Date()).toString() + '.' +  args.modeltype
      , has_color: args.has_color ? true : false
    });
  } else {
    cb(new Error("Missing model"), null);
    return;
  }
}
