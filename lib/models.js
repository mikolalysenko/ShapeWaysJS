var fs = require('fs')
  , TinyZip = require('./tinyzip-mod/tinyzip.js').TinyZip
  , path = require('path')
  , PNG = require('pngjs').PNG
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
  
  //Work around: Also accept `positions` instead of just `verts` to be compatible with trimesh.js
  var mverts = model.positions || model.verts || model.vertices;
  if(!(mverts && model.faces && mverts.length && model.faces)) {
    return null;
  }
  
  var buffer = [];
  
  //Write header
  buffer.push("#VRML V2.0 utf8\n\nShape { geometry IndexedFaceSet { coord Coordinate { point [ ");
  
  //Write vertices  
  for(var i=0; i<mverts.length; ++i) {
    buffer.push(mverts[i].join(' '));
    buffer.push(',');
  }
  buffer.push(" ] } coordIndex ");
  
  //Write faces
  var faces = ["[ "];
  for(var i=0; i<model.faces.length; ++i) {
    faces.push(model.faces[i].join(','))
    faces.push(',-1,');
  }
  faces.push(' ]');
  var face_str = faces.join('');
  
  buffer.push(face_str);


  if(('vert_uvs' in model) && texture_name) {
  
    if(model.vert_uvs.length !== mverts.length) {
      return null;
    }
  
    //(Optional) Write texture coordinates
    buffer.push(" texCoord TextureCoordinate { point [ ");
    for(var i=0; i<model.vert_uvs.length; ++i) {
      buffer.push(model.vert_uvs[i].join(' '));
      buffer.push(", ");
    }

    buffer.push(" ] } texCoordIndex ");
    buffer.push(face_str);    
  } else if(('face_uvs' in model) && texture_name) {
  
    //(Optional) Generate face uvs
    if(model.face_uvs.length !== model.faces.length) {
      return null;
    }

    buffer.push(" texCoord TextureCoordinate { point [ ");
    for(var i=0; i<model.face_uvs.length; ++i) {
      var f = model.face_uvs[i];
      for(var j=0; j<f.length; ++j) {
        buffer.push(f[j].join(' '));
        buffer.push(", ");
      }
    }

    buffer.push(" ] } texCoordIndex [ ");
    for(var i=0; i<model.faces.length; ++i) {
      buffer.push([4*i, 4*i+1, 4*i+2, 4*i+3, -1, ''].join(','));
    }
    buffer.push(" ]");
    
  } else if('face_colors' in model) {
  
    //(Optional) Use per face colors
    buffer.push("color Color { color [ ");
    
    for(var i=0; i<model.face_colors.length; ++i) {
      buffer.push(model.face_colors[i].join(','));
      buffer.push(",");
    }
    buffer.push(" ] } colorPerVertex FALSE colorIndex [ ");
    for(var i=0; i<model.faces.length; ++i) {
      buffer.push(i + ' ');
    }
    buffer.push("]");
  }
  
  if(texture_name) {
    buffer.push(' } appearance Appearance { texture ImageTexture { url "');
    buffer.push(texture_name);
    buffer.push('" } } }');
  } else {
    buffer.push(" } }");
  }
  
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
    
      if(!model_buffer) {
        cb(new Error("Invalid model"), null);
        return;
      }
    
      //Fixup model path
      model_name = path.basename(model_name);
    
    
      var archive = new TinyZip();
         
      archive.addFile({file: model_name, data: model_buffer, compress:true});
      
      //Only add texture if supported
      if(has_color && !!texture_buffer && model_types[model_type].texture) {
        archive.addFile({file:texture_name, data: texture_buffer, compress:true });
      }
      
      var parts = []
        , stream = archive.getZipStream()
        , data_len = 0;
      
      stream.on('data', function(data) {
        parts.push(data);
        data_len += data.length;
      });
      
      stream.on('end', function() {
        var buf = new Buffer(data_len)
          , buf_ptr = 0;
        for(var i=0; i<parts.length; ++i) {
          parts[i].copy(buf, buf_ptr);
          buf_ptr += parts[i].length;
        }
        
        cb(null, {
              modeltype: 'ZIP'
            , model: buf.toString('base64')
            , filename: tempFileName() + '.zip'
            , has_color: has_color
          });
      });
    }
  
    var type = args.modeltype || args.model_type || null;
  
    if('model_json' in args) {
      var model = args.model_json
        , has_color = ('face_colors' in model);
      if( !!texture_buffer ) {
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
    var img = new PNG({
        width: texture_width,
        height:texture_height
      });
    if(texture_array instanceof Buffer && texture_order === "rgba") {
      texture_array.copy(img.data);
    } else {
      var target = img.data;
      switch(texture_order) {
        case "rgb":
          if(texture_array.length !== 3*texture_width * texture_height) {
            cb(new Error("Invalid texture dimensions"), null);
            return;
          }
          for(var i=0, j=0; i<4*texture_width*texture_height; i+=4, j+=3) {
            target[i]   = texture_array[j];
            target[i+1] = texture_array[j+1];
            target[i+2] = texture_array[j+2];
            target[i+3] = 0xff;
          }
        break;
        case "bgr":
          if(texture_array.length !== 3*texture_width * texture_height) {
            cb(new Error("Invalid texture dimensions"), null);
            return;
          }
          for(var i=0, j=0; i<4*texture_width*texture_height; i+=4, j+=3) {
            target[i]   = texture_array[j+2];
            target[i+1] = texture_array[j+1];
            target[i+2] = texture_array[j];
            target[i+3] = 0xff;
          }
        break;
        case "rgba":
          if(texture_array.length !== 4*texture_width * texture_height) {
            cb(new Error("Invalid texture dimensions"), null);
            return;
          }
          for(var i=0; i<4*texture_width*texture_height; i+=4) {
            target[i]   = texture_array[i];
            target[i+1] = texture_array[i+1];
            target[i+2] = texture_array[i+2];
            target[i+3] = texture_array[i+3];
          }
        break;
        case "bgra":
          if(texture_array.length !== 4*texture_width * texture_height) {
            cb(new Error("Invalid texture dimensions"), null);
            return;
          }
          for(var i=0; i<4*texture_width*texture_height; i+=4) {
            target[i]   = texture_array[i+2];
            target[i+1] = texture_array[i+1];
            target[i+2] = texture_array[i];
            target[i+3] = texture_array[i+3];
          }
        break;
        default:
          cb(new Error("Invalid texture order: " + texture_order), null);
          return;
      }
    }
    
    var png_stream = img.pack()
      , parts = []
      , result_len = 0;
    png_stream.on("error", function() {
      cb(new Error("Error encoding texture data into PNG"), null);
    });
    png_stream.on("data", function(data) {
      parts.push(data);
      result_len += data.length;
    });
    png_stream.on("end", function() {
      var result = new Buffer(result_len);
      for(var i=0, ptr=0; i<parts.length; ++i) {
        parts[i].copy(result, ptr);
        ptr += parts[i].length;
      }
      create_model('PNG', result, tempFileName() + '.png');
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
