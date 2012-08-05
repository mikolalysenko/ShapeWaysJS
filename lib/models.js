var fs = require('fs')
  , zip = require('node-native-zip')
  , path = require('path')
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


function tempFileName() {
  return (new Date()).toString().replace(/\W/ig, '_');
}


//Converts simple json formatted model to vrml2 for upload to shapeways
function json2vrml(model, texture_file) {
  "use strict";
  
  var buffer = [];
  
  //Write header  
  buffer.push([
      "#VRML V2.0 utf8"
    , ""
    , 'NavigationInfo {'
    , '  type [ "EXAMINE", "ANY" ]'
    , '}'
    , "Transform {"
    , "  scale 1 1 1"
    , "  translation 0 0 0"
    , "  children"
    , "  ["
    , "    Shape"
    , "    {"
    , "      geometry IndexedFaceSet"
    , "      {"
    , "        creaseAngle .5"
    , "        solid TRUE"
    , "        coord Coordinate"
    , "        {"
    , "          point"
    , "          [\n"
    ].join('\n'));
    
  
  //Write vertices  
  for(var i=0; i<model.verts.length; ++i) {
    buffer.push(['            ', model.verts[i].join(' '), ',\n'].join(''));
  }
  buffer.push([
      "          ]"
    , "        }"
    , "        coordIndex"
    , "        [\n"].join('\n'));
  
  
  //Write faces
  for(var i=0; i<model.faces.length; ++i) {
    buffer.push(['          ', model.faces[i].join(', '), ', -1,\n'].join(''));
  }
  buffer.push("          ]\n");


  if('tex_coords' in model && texture_file) {
  
    //(Optional) Write texture coordinates
    buffer.push([
        "        texCoord TextureCoordinate"
      , "        {"
      , "          point"
      , "          [\n"].join('\n') ) ;
    for(var i=0; i<model.tex_coords.length; ++i) {
      buffer.push(["           ", model.tex_coords[i], "\n"].join(''));
    }
    buffer.push([
        "          ]"
      , "        }"
      , "        appearance Appearance"
      , "        {"
      , '          texture ImageTexture { url "' + texture_file + '" }'
      , "        }\n"].join('\n') ) ;
      
  } else if('face_colors' in model) {
  
    //(Optional) Use per face colors
    buffer.push([
        "        color Color"
      , "        {"
      , "          color"
      , "          [\n"].join('\n') ) ;
    for(var i=0; i<model.face_colors.length; ++i) {
      buffer.push(["           ", model.face_colors[i], ",\n"].join(' '));
    }
    buffer.push([
      , "          ]"
      , "        }"
      , "        colorPerVertex FALSE"
      , "        colorIndex [\n"].join('\n'));
    for(var i=0; i<model.faces.length; ++i) {
      buffer.push(["           ", i, "\n"].join(''));
    }
    buffer.push("        ]\n");
  }
  
  
  buffer.push([
      "      }"
    , "    }"
    , "  ]"
    , "}"
    ].join('\n'));
  
  
  //Convert to node.js buffer
  var sz = 0;
  for(var i=0; i<buffer.length; ++i) {
    sz += buffer[i].length;
  }
  var result = new Buffer(sz);
  for(var i=0, ptr=0; i<buffer.length; ++i) {
    result.write(buffer[i], ptr);
    ptr += buffer[i].length;
  }
  
  return result;
}



exports.read_model = function(args, cb) {
  
  "use strict";
  
  //Handle the model
  function create_model(texture_type, texture_buffer, texture_name) {
  
    "use strict";
    
    //Fixup texture path
    if(texture_name) {
      texture_name = path.basename(texture_name);
    }

    function create_archive(model_type, model_buffer, model_name, has_color) {
      //Fixup model path
      model_name = path.basename(model_name);
    
    
      var archive = new zip();
      archive.add(model_name, model_buffer);
      
      if(has_color && !!texture_buffer) {
        archive.add(texture_name, texture_buffer);
      }
      
      cb(null, {
            modeltype: 'ZIP'
          , model: archive.toBuffer()
          , filename: tempFileName() + '.zip'
          , has_color: has_color
        });
    }
  
    var type = args.modeltype || args.model_type || null;
  
    if('model_json' in args) {
      var model = args.model_json
        , has_color = ((!!texture_buffer) && 'tex_coords' in model) || ('face_colors' in model);
        
      create_archive('VRML', json2vrml(model, texture_name), tempFileName() + '.wrl', has_color);
            
    } else if('model_filename' in args) {
    
      var filename = args.model_filename
        , extension = path.extname(filename)
        , type = (type || extension).toUpperCase();
        
      if(type.length > 0 && type.charAt(0) === '.') {
        type = type.substr(1);
      }
      if(!type in model_types) {
        cb(new Error("Bad model type"), null);
        return;
      }
      var mtype = model_types[type]
        , has_color = mtype.color && !!args.has_color;
        
      fs.readFile(filename, function(err, data) {
        if(err) {
          cb(err, null);
          return;
        }
        
        //Special case: pass through zip files
        if(mtype.type === 'ZIP') {
          cb(null, {
              modeltype: mtype.type
            , model: data
            , filename: filename
            , has_color: has_color
          });
          return;
        } else {
          create_archive(mtype.type, data, filename, has_color);
          return;
        }
      });
    } else if('model_buffer' in args) {

      if(!type) {
        cb(new Error("Missing modeltype"), null);
        return;
      }
      
      type = type.toUpperCase();      
      
      //Special case: pass through zip files
      if(type === 'ZIP') {
        cb(null, {
            modeltype: args.modeltype
          , model: args.model_buffer
          , filename: tempFileName() + '.' +  args.modeltype
          , has_color: !!args.has_color
        });
        return;
      } else {
        //Otherwise, archive it first
        create_archive(type, args.model_buffer, tempFileName() + '.' +  args.modeltype, !!args.has_color);
        return;
      }
    } else {
      cb(new Error("Missing model"), null);
      return;
    }
  }
  
  //Check for texture
  if('texture_array' in args) {
  
  } else if('texture_buffer' in args) {
  
  } else if('texture_filename' in args) {
  
    fs.readFile(args.tex
  
  } else {
    //Don't use texture
    create_model(null, null, null);
  } 
}
