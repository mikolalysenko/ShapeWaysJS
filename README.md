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
                                        



# Introduction #

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

Via npm:

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

In addition to the above parameters, you also need to specify a model.  There are three different ways you can do this:

1. Files

     If you already have a copy of your model saved to the file system, you can upload it directly.  ShapeWays supports the following file formats:  
     * [VRML](http://graphcomp.com/info/specs/sgi/vrml/spec/)
     * [STL](http://en.wikipedia.org/wiki/STL_%28file_format%29) (both binary and ascii)
     * [X3D](http://www.web3d.org/x3d/)
     * [DAE](http://www.khronos.org/collada/) (Collada)
     * And ZIP archives of any of the above.
     To upload a file, set _model_filename_ to the path to your model in _options_. 
     
     __Note:__ If you have a VRML part with face colors or a [ZIP archive with textures included](http://www.shapeways.com/tutorials/exporting_to_vrml_and_x3d_for_color_printing), then you can additionally set _has_color_ to _true_ in _options_ .  The library will try to infer the file type from the extension, though this behavior can be overriden by specifying a model type in the _modeltype_ option.
   
2. Buffer:
  
    The buffer interface for uploads is almost identical to that for files, except that it takes a [Buffer](http://nodejs.org/api/buffer.html) object instead of a path to a file.  There are only a few slight differences:
    
    * To specify a buffer, set the _model_buffer_ option to the buffer itself.
    * 


3. JSON:




# Legal stuff

ShapeWays is a trademark of ShapeWays Inc.  This is of course free software and is provided without any warranty.

