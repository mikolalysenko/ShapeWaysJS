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

This is a node.js library for interfacing with [ShapeWays](http://www.shapeways.com/) web-based 3D printing service.  It allows you to:

* Upload models
* Query printers
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


# API

## connect

Connects to ShapeWays' API service.

## ShapeWaysConnection

### printers

Returns a list of all available printers

### materials

Returns a list of all available materials

### upload

Uploads a model

### addToCart

Returns a URL for adding an item to the shapeways cart

