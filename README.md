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
                                        



# Introduction

This is a node.js library for interfacing with the [ShapeWays](http://www.shapeways.com/) 3D printing service.  It allows you to:

* Upload 3D models
* Query printers and materials
* Add items to shopping carts

# Example

Here is a trivial example showing how to upload a part to shapeways

    require('shapeways').connect({
        username:  'Your Shapeways Username'
      , password:  'Your Shapeways Password'
    }, function(err, conn) {

      conn.upload({
          title:    'Test Model'
        , filename: 'test_model.stl'
      })
    });


# Install

Via npm:

    npm install shapeways

# API

## connect

Connects to ShapeWays' API service.

## ShapeWaysConnection

### printers

A list of all available printers

### materials

A list of all available materials

### upload(options, callback)

Options is an object having a list of parameters for the 3D part.

* title : (optional) Title of the part
* desc : (optional) A short description of the part
* tags: (optional) A comma delimited list of tagged attributes
* view_state:  A string describing the view state of the object, must be one of, 'hidden', 'for sale', 'view only' .  Default is 'for sale'.
* filename: Path to the 3D model
* has_color: (optional) If set, will try uploading color model.
* units: The units for the part, must be either 'mm', 'cm', 'm', 'inches' or 'feet'
* scale: The scale of the part in meters.  If present, overrides units.  Default is 0.01 (cm)
* markup: Mark up in dollars.  Default is 0

### cart_url(model_id, material)

Returns a formatted URL for adding a part to the shopping cart.

# Legal stuff

ShapeWays is a trademark of ShapeWays Inc.  This is of course free software and is provided without any warranty.

