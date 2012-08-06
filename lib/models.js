var fs = require('fs')
  , zip = require('node-native-zip')
  , path = require('path')
  , Png = require('png').Png
  , Buffer = require('buffer').Buffer;
  
var model_types = {
    'VRML': { color: true, type: 'VRML', texture:true, extension:'wrl' }
  , 'WRL': { color: true, type: 'VRML', texture:true, extension:'wrl' }
  , 'STL': { color: false, type: 'STL', texture:false, extension:'stl' }
  , 'X3D': { color: true, type: 'X3D', texture:true, extension:'x3d' }
  , 'X3DB': { color: true, type: 'X3DB', texture:true, extension:'x3db' }
  , 'X3DV': { color: true, type: 'X3DV', texture:true, extension:'x3dv' }
  , 'DAE': { color: false, type: 'DAE', texture:false, extension: 'dae' }
  , 'COLLADA': { color: false, type: 'DAE', texture:false, extension:'dae' }
  , 'ZIP': { color: true, type: 'ZIP', texture:false, extension:'zip' }
};

var texture_types = {
    'PNG' : { type: 'PNG' }
  , 'JPG' : { type: 'JPG' }
  , 'JPEG' : { type: 'JPG' }  
};


function tempFileName() {
  return (new Date()).toString().replace(/\W/ig, '_');
}


//Converts simple json formatted model to vrml2 for upload to shapeways
function json2vrml(model, texture_name) {
  "use strict";
  
  if(!('verts' in model) || !('faces' in model)) {
    return null;
  }

  
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
    , "        coordIndex DEF FACES"
    , "        [\n"].join('\n'));
  
  
  //Write faces
  for(var i=0; i<model.faces.length; ++i) {
    buffer.push(['          ', model.faces[i].join(', '), ', -1,\n'].join(''));
  }
  buffer.push("          ]\n");


  if(('vert_uvs' in model) && texture_name) {
  
    if(model.vert_uvs.length !== model.verts.length) {
      return null;
    }
  
    //(Optional) Write texture coordinates
    buffer.push([
        "        texCoord TextureCoordinate"
      , "        {"
      , "          point"
      , "          [\n"].join('\n') ) ;

    for(var i=0; i<model.vert_uvs.length; ++i) {
      buffer.push(["           ", model.vert_uvs[i].join(' '), ",\n"].join(''));
    }

    buffer.push([
        "          ]"
      , "        }"
      , "        appearance Appearance"
      , "        {"
      , '          texture ImageTexture { url "' + texture_name + '" }'
      , "        }\n"].join('\n') ) ;
  } else if(('face_uvs' in model) && texture_name) {
  
    //Generate face uvs
  
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
  
  console.log(buffer.join(''));
  
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
    
      if(!model_buffer) {
        cb(new Error("Invalid model"), null);
        return;
      }
    
      //Fixup model path
      model_name = path.basename(model_name);
    
    
      var archive = new zip();
      archive.add(model_name, model_buffer);
      
      //Only add texture if supported
      if(has_color && !!texture_buffer && model_types[model_type].texture) {
        archive.add(texture_name, texture_buffer);
      }
      
      console.log("color status = ", has_color);
      
      fs.writeFile("test_archive.zip", archive.toBuffer());
      
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
        , has_color = ('face_colors' in model);
      if( (!!texture_buffer) ) {
        has_color = has_color || ('vert_uvs' in model) || ('face_uvs' in model);
      }
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
              modeltype: 'ZIP'
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
      if(!(type in model_types)) {
        cb(new Error("Invalid model type"), null);
        return;
      }
      
      //Special case: pass through zip files
      if(type === 'ZIP') {
        cb(null, {
            modeltype: 'ZIP'
          , model: args.model_buffer
          , filename: tempFileName() + '.zip'
          , has_color: !!args.has_color
        });
        return;
      } else {
      
        //Otherwise, archive it first
        var mtype = model_types[type];
        create_archive(mtype.type, args.model_buffer, tempFileName() + '.' +  mtype.extension, !!args.has_color);
        return;
      }
    } else {
      cb(new Error("Missing model"), null);
      return;
    }
  }
  
  //Check for texture
  if('texture_bitmap' in args) {
  
    if( !('texture_width' in args) || !('texture_height' in args) ) {
      cb(new Error("Missing texture dimensions"), null);
      return;
    }
    var texture_width = args.texture_width
      , texture_height = args.texture_height
      , texture_order = args.texture_order || 'rgb'
      , texture_array = args.texture_bitmap
      , texture_size = texture_width * texture_height * texture_order.length;

    if(texture_size !== texture_array.length) {
      cb(new Error("Invalid buffer length"), null);
      return;
    }

    if(!(texture_array instanceof Buffer)) {
      var buf = new Buffer(texture_size);
      for(var i=0; i<texture_size; ++i) {
        buf[i] = texture_array[i];
      }
      texture_array = buf;
    }
    
    //Encode png
    var png = new Png(texture_array, texture_width, texture_height, texture_order);
    png.encode(function(data) {
      create_model('PNG', data, tempFileName() + '.png');
    });
  
  } else if('texture_buffer' in args) {
  
    //Read texture from buffer
    if(!('texture_type' in args)) {
      cb(new Error("Missing texture_type for texture_buffer"), null);
      return;
    }
    var buffer = args.texture_buffer
      , type = args.texture_type.toUpperCase();
    if(!(type in texture_types)) {
      cb(new Error("Invalid texture type, must be either JPG or PNG"), null);
      return;
    }
    create_model(type, buffer, tempFileName()+"."+type);
  } else if('texture_filename' in args) {
  
    //Read texture from file
    var filename = path.basename(args.texture_filename)
      , texture_type = path.extname(filename).toUpperCase();
      
    if(texture_type.length > 0) {
      texture_type = texture_type.slice(1);
    }
      
    console.log(texture_type);
    if(!(texture_type in texture_types)) {
      cb(new Error("Invalid texture type"), null);
      return;
    }
    fs.readFile(filename, function(err, data) {
      if(err) {
        cb(err, null);
        return;
      }
      create_model(texture_types[texture_type].type, data, filename);
    });  
  } else {
    //Don't use texture
    create_model(null, null, null);
  } 
}
