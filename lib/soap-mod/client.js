/*
 * Copyright (c) 2011 Vinay Pulim <vinay@milewise.com>
 * MIT Licensed
 */

var Buffer = require('buffer').Buffer
  , Stream = require('stream');

function findKey(obj, val) {
    for (var n in obj) if (obj[n] === val) return n;
}

var http = require('http'),
    assert = require('assert'),
    url = require('url');

var Client = function(wsdl, endpoint) {
    this.wsdl = wsdl;
    this._initializeServices(endpoint);
}

Client.prototype.setEndpoint = function(endpoint) {
    this.endpoint = endpoint;
    this._initializeServices(endpoint);
}

Client.prototype.describe = function() {
    var types = this.wsdl.definitions.types;
    return this.wsdl.describeServices();
}

Client.prototype.setSecurity = function(security) {
    this.security = security;
}

Client.prototype.setSOAPAction = function(SOAPAction) {
    this.SOAPAction = SOAPAction;
}

Client.prototype._initializeServices = function(endpoint) {
    var definitions = this.wsdl.definitions,
        services = definitions.services;
    for (var name in services) {
        this[name] = this._defineService(services[name], endpoint);
    }
}

Client.prototype._defineService = function(service, endpoint) {
    var ports = service.ports,
        def = {};
    for (var name in ports) {
        def[name] = this._definePort(ports[name], endpoint ? endpoint : ports[name].location);
    }
    return def;
}

Client.prototype._definePort = function(port, endpoint) {
    var location = endpoint,
        binding = port.binding,
        methods = binding.methods,
        def = {};
    for (var name in methods) {
        def[name] = this._defineMethod(methods[name], location);
        if (!this[name]) this[name] = def[name];
    }
    return def;
}

Client.prototype._defineMethod = function(method, location) {
    var self = this;
    return function(args, callback) {
        if (typeof args === 'function') {
            callback = args;
            args = {};
        }
        self._invoke(method, args, location, function(error, result, raw) {
            callback(error, result, raw);
        })
    }
}

Client.prototype._invoke = function(method, arguments, location, callback) {
    var self = this,
        name = method.$name,
        input = method.input,
        output = method.output,
        style = method.style,
        defs = this.wsdl.definitions,
        ns = defs.$targetNamespace,
        encoding = '',
        message = '',
        xml = null,
        options = url.parse(location),
        headers = {
            SOAPAction: this.SOAPAction ? this.SOAPAction(ns, name) : (((ns.lastIndexOf("/") != ns.length - 1) ? ns + "/" : ns) + name),
            'Content-Type': "text/xml; charset=utf-8",
      		"User-Agent": "node-shapeways/1.0",
		      "Accept" : "text/html,application/xhtml+xml,application/xml",
              "Accept-Encoding": "none",
              "Accept-Charset": "utf-8",
              "Connection": "close",
              "Host": options.host
        },
        alias = findKey(defs.xmlns, ns);
        
    // Allow the security object to add headers
    if (self.security && self.security.addHeaders)
        self.security.addHeaders(headers);
    if (self.security && self.security.addOptions)
        self.security.addOptions(options);
        
    if (input.parts) {
        assert.ok(!style || style == 'rpc', 'invalid message definition for document style binding');
        message = self.wsdl.objectToRpcXML(name, arguments, alias, ns);
        (method.inputSoap === 'encoded') && (encoding = 'soap:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" ');
    }
    else {
        assert.ok(!style || style == 'document', 'invalid message definition for rpc style binding');
        message = self.wsdl.objectToDocumentXML(input.$name, arguments, input.targetNSAlias, input.targetNamespace);
    }
    
    options.method = 'POST';
    options.headers = headers;
    
    var prelude = "<soap:Envelope " + 
            "xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\" " +
            encoding +
            this.wsdl.xmlnsInEnvelope + '>' +
            "<soap:Header>" +
                (self.security ? self.security.toXML() : "") +
            "</soap:Header>" +
            "<soap:Body>"
      , epilog = "</soap:Body></soap:Envelope>";
    
    //Need to calculate length derp SOAP
    var length = prelude.length + epilog.length;
    for(var i=0; i<message.length; ++i) {
      if(message[i] instanceof Buffer) {
        length += message[i].byteLength;
      } else {
        length += message[i].length;
      }
    }    
    options.headers['Content-Length'] = length;
    
    var req = http.request(options, function(res) {
    
      var body = "";
      
      res.on('data', function(chunk) {
        body += chunk.toString();
      });
    
      res.on('end', function() {
        try {
          var obj = self.wsdl.xmlToObject(body);
        }
        catch (error) {
          return callback(error, null, body);
        }
        var result = obj.Body[output.$name];
        // RPC/literal response body may contain element named after the method + 'Response'
        // This doesn't necessarily equal the ouput message name. See WSDL 1.1 Section 2.4.5
        if(!result) {
          result = obj.Body[name + 'Response'];
        }
        callback(null, result, body);
      });
      
      res.on('error', callback);
    });
    
    req.on('error', callback);
    
    //Write body of message
    
    var ptr = -1;
    function pump_data() {
      while(true) {
        if(ptr >= message.length) {
          req.end(epilog);
          return;
        } else if(ptr < 0) {
          ptr++;
          if(!req.write(prelude)) {
            req.once('drain', pump_data);
          }
        } else {
          var m = message[ptr++];
          if(!req.write(m)) {
            break;
          }
        }
      }
      req.once('drain', pump_data);
    };
    
    pump_data();
}

exports

exports.Client = Client;
