      /$$$$$$  /$$                                     /$$      /$$                                     /$$$$$  /$$$$$$ 
     /$$__  $$| $$                                    | $$  /$ | $$                                    |__  $$ /$$__  $$
    | $$  \__/| $$$$$$$   /$$$$$$   /$$$$$$   /$$$$$$ | $$ /$$$| $$  /$$$$$$  /$$   /$$  /$$$$$$$         | $$| $$  \__/
    |  $$$$$$ | $$__  $$ |____  $$ /$$__  $$ /$$__  $$| $$/$$ $$ $$ |____  $$| $$  | $$ /$$_____/         | $$|  $$$$$$ 
     \____  $$| $$  \ $$  /$$$$$$$| $$  \ $$| $$$$$$$$| $$$$_  $$$$  /$$$$$$$| $$  | $$|  $$$$$$     /$$  | $$ \____  $$
     /$$  \ $$| $$  | $$ /$$__  $$| $$  | $$| $$_____/| $$$/ \  $$$ /$$__  $$| $$  | $$ \____  $$   | $$  | $$ /$$  \ $$
    |  $$$$$$/| $$  | $$|  $$$$$$$| $$$$$$$/|  $$$$$$$| $$/   \  $$|  $$$$$$$|  $$$$$$$ /$$$$$$$//$$|  $$$$$$/|  $$$$$$/
     \______/ |__/  |__/ \_______/| $$____/  \_______/|__/     \__/ \_______/ \____  $$|_______/|__/ \______/  \______/ 
                                  | $$                                        /$$  | $$                                 
                                  | $$                                       |  $$$$$$/                                 
                                  |__/                                        \______/                                  
                                        


# About #

This is a node.js library for interfacing with the [ShapeWays](http://www.shapeways.com/) 3D printing service.  It allows you to:

* Query printers and materials
* Upload 3D models

The package here is basically a thin wrapper for [ShapeWays SOAP API](http://www.shapeways.com/api).  Once you've uploaded models using this library, you can sell them using the client side [Add to Cart API](http://www.shapeways.com/tutorials/shoppingcart/index.html).

# Example #

To use the API, first you connect to ShapeWays using your username and password.  Once you have a connection established, you can upload models to the server using this data.  That's it!

Here is a trivial example showing how to upload an STL file:

    require('shapeways').connect({
        username:  'Your Shapeways Username'
      , password:  'Your Shapeways Password'
    }, function(err, conn) {

      conn.upload({
          title:    'Test Model'
        , model_filename: 'test_model.stl'
      })
    });

# Install #

    npm install shapeways

-------------------------------------------------------

# API #

### connect(options, callback(__err, conn__) ) ###

This method connects to ShapeWays.  It accepts the following options:

* _username_ : (Required) The username of your account at ShapeWays
* _password_ : (Required) The password of your account at ShapeWays
* _application_id_ : (Optional) An optional string to identify your application

If there was an error connecting, _callback_ will be called with an _Error_ object describing the reason for termination.  Otherwise, it will get a second parameter, _conn_, which is an object tracking the connection to ShapeWays' API.

## Connection Object Members ##

The connection object, _conn_, created by _connect_, has the following properties and methods:

### printers ###

The _printers_ property is an array of all currently available 3D printers.  Each printer has the following fields:

* _title_ : The name of the printer
* _volume_ : A field representing the total volume it can print
* _wallthickness_ : A lower bound on the wall thickness of any printable object
* _technology_ : A description of the supported printing technology
* _x/y/z_bound_min/max_ : The 3D space of the printer in cm
* _materials_ : An array of supported materials

### materials ###

The _materials_ property is a JSON dictionary of available printing materials, keyed by their name.  Each material has the following properties:

* _id_ : The internal id used by ShapeWays to index each material type.
* _title_ : The name of the material
* _description_ : An optional short description of the material
* _startup_cost_ : A fixed cost required to use this material (in USD)


### upload(options, callback(__err__, __model_id__ ) ###

The _upload_ method sends a model to ShapeWays.  _options_ is a dictionary containing any of the following parameters along with a model and optional texture.

* _title_ :  Title of the part.  Default: "Unnamed Model"
* _desc_ : A short description of the model. Default: ""
* _tags_ : A comma delimited list of tagged attributes.  Default: ""
* _view_state_ :  A string describing the view state of the object, must be one of, 'hidden', 'for sale', 'view only' .  Default: 'for sale'
* _markup_ : (optional) Mark up in dollars.  Default: 0
* _units_ : (optional) The units for the model, must be either 'mm', 'cm', 'm', 'inches' or 'feet'.  Default: 'cm'
* _scale_ : The scale of the model in meters.  If present, overrides units.  Default: 0.01 (note: same as 'cm' for units)

When _upload_ completes, it calls _callback_ with either an error code, or else a string _model_id_ representing the upload in the ShapeWays database.  This _model_id_ can be used with ShapeWays [Add To Cart API](http://www.shapeways.com/tutorials/shoppingcart/index.html) to sell the model in a store.

__Note:__ It takes some time between when the model is uploaded to ShapeWays and when it appears for sale.  Some models may not be printable and must be inspected first.  Unfortunately, ShapeWays only notifies of the results of these inspections by email, and so there is for now way to check the status of a part programmatically.

#### Models ####

In addition to the above parameters, you also need to specify a model.  There are three different ways you can do this:

* __Files__

   If you already have a copy of your model saved to the file system, you can upload it directly.  ShapeWays supports the following file formats:  
     
     * [VRML](http://graphcomp.com/info/specs/sgi/vrml/spec/)
     * [STL](http://en.wikipedia.org/wiki/STL_%28file_format%29) (both binary and ascii)
     * [X3D](http://www.web3d.org/x3d/)
     * [DAE](http://www.khronos.org/collada/) (Collada)
     * And ZIP archives of any of the above.
     
   To upload a file, set _model_filename_ to the path to your model in _options_. 
     
   __Note:__ If you have a VRML part with face colors or a [ZIP archive with textures included](http://www.shapeways.com/tutorials/exporting_to_vrml_and_x3d_for_color_printing), then you can additionally set _has_color_ to _true_ in _options_ .  The library will try to infer the file type from the extension, though this behavior can be overriden by specifying a model type in the _modeltype_ option.  Finally, before upload this library internally converts all formats to a ZIP archive to conserve bandwidth and reduce upload times.
   
* __Buffers__
  
    The buffer interface for uploads is almost identical to the file interface, except that it takes a [Buffer](http://nodejs.org/api/buffer.html) object instead of a path to a file.  There are only a few slight differences:
    
    * To specify a buffer, set the _model_buffer_ option to the buffer itself.
    * You must also specify a _modeltype_ from the above list.

* __JSON__

    While the above two methods may be sufficient for some purposes, the interchange formats accepted by ShapeWays API are quite cumbersome for applications that process or manipulate 3D geometry in Javascript.  To facilitate working with models in Javascript, I added an extra option to directly upload an indexed set of faces using JSON.  To do this, you specify an object in the _model_json_ field.  For example, here is the option field required to upload a multicolored cube:

        conn.upload({
            title: 'Test JSON Cube'
          , units: 'cm'
          , model_json: {
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
            , face_colors: [
                    [1, 0, 0]
                  , [0, 1, 0]
                  , [0, 0, 1]
                  , [0, 1, 1]
                  , [1, 0, 1]
                  , [1, 1, 0]
              ]
          }
        }); 
    
    _model_json_ may have the following parameters
    
    * _verts_ : An array of length 3 arrays describing the vertices of the model
    * _faces_ : An array of arrays of indices describing the faces as counter clockwise oriented polygons.
    * _face_colors_ : (Optional) An array of colors for each face (must be same length as _faces_)
    * _face_uvs_ : (Optional) An array of __per-face__ texture coordinates (must be same length as _faces_ ).  Overrides _face_colors_ if present along with a texture (see below).
    * _vert_uvs_ : (Optional) An array of __per-vertex__ texture coordinates (must be same length as _verts_).  Overrides _face_colors_ and  _face_uvs_ if present along with a texture (see below).
    
    __Note:__ It is redundant to specify more than one of _face_colors, _face_uvs_ or _vert_uvs_.

#### Textures ####

You can also specify [textures](http://www.shapeways.com/tutorials/exporting_to_vrml_and_x3d_for_color_printing) to color your models.  Note that only VRML and X3D formats support this feature.  Currently, the following methods for specifying a texture are supported:

* __Files__

    To specify a texture as a file, set the option _texture_filename_ to the path of the file.
    
    __Note:__ Only PNG and JPEG are supported.  _texture_filename_ must have the correct extension.
    
* __Buffers__

    You can also send a buffer containing a PNG or JPEG directly.  To do this, set _texture_buffer_ to the buffer of the texture and set _texture_type_ to the type of the texture (either PNG or JPEG).

* __Bitmaps__
  
    Finally, for procedurally generated textures there is an interface for uploading raw bitmaps.  To do this, you need to specify the following data:
    
      * _texture_bitmap_ : The raw bitmap storing the texture, either a buffer, array or typed array; flattened in row major order starting from the upper left.
      * _texture_width_ : The width of the texture
      * _texture_height_ : The height of the texture
      * _texture_order_ : The pixel order of the texture.  Can be 'rgb', 'bgr', 'rgba or 'bgra'. Default: 'rgb'.

-------------------------------------------------------

# More Examples #

Several examples of the API can be found in the examples/ directory.  

# Final Notes #

This library is still in early development, and ShapeWays' API is currently in flux.  It is likely that some of these features may change over time.

# Credits #

This unofficial wrapper was written by Mikola Lysenko, and is not in any way supported by or affiliated with ShapeWays.  This package includes a modified version of [node-soap](https://github.com/milewise/node-soap/), with patches to work around some API compatibility problems.  Additionally, it uses a modified version of Segrgey Korotov's [tinyzip](https://github.com/sergeyksv/tinyzip), which was extended to handle raw file stream/buffer input.  Other than the files in lib/soap-mod and lib/tinyzip-mod, this project is covered by the MIT license.  This project has external dependencies on the following npm modules: [node-expat](https://github.com/astro/node-expat/), [png](https://github.com/pkrumins/node-png), [underscore.js](http://underscorejs.org/) [request](https://github.com/mikeal/request/)

