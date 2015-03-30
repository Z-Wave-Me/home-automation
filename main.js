/*** Z-Way Home Automation Engine main executable *****************************

Version: 0.1.2
(c) ZWave.Me, 2013

-------------------------------------------------------------------------------
Author: Gregory Sitnin <sitnin@z-wave.me>

Description:
  This is a main executable script which is loaded and executed solely
  by the z-way-server daemon. The very magic starts here.

******************************************************************************/

//--- Define global variables and helpers

var window = global = this;

var console = {
    log: debugPrint,
    warn: debugPrint,
    error: debugPrint,
    debug: debugPrint,
    logJS: function() {
        var arr = [];
        for (var key in arguments)
            arr.push(JSON.stringify(arguments[key]));
        debugPrint(arr);
    }
};

var Base64 = {
    _keyStr:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
    encode:function(e){var t="";var n,r,i,s,o,u,a;var f=0;e=Base64._utf8_encode(e);while(f<e.length){n=e.charCodeAt(f++);r=e.charCodeAt(f++);i=e.charCodeAt(f++);s=n>>2;o=(n&3)<<4|r>>4;u=(r&15)<<2|i>>6;a=i&63;if(isNaN(r)){u=a=64}else if(isNaN(i)){a=64}t=t+this._keyStr.charAt(s)+this._keyStr.charAt(o)+this._keyStr.charAt(u)+this._keyStr.charAt(a)}return t},
    decode:function(e){var t="";var n,r,i;var s,o,u,a;var f=0;e=e.replace(/[^A-Za-z0-9\+\/\=]/g,"");while(f<e.length){s=this._keyStr.indexOf(e.charAt(f++));o=this._keyStr.indexOf(e.charAt(f++));u=this._keyStr.indexOf(e.charAt(f++));a=this._keyStr.indexOf(e.charAt(f++));n=s<<2|o>>4;r=(o&15)<<4|u>>2;i=(u&3)<<6|a;t=t+String.fromCharCode(n);if(u!=64){t=t+String.fromCharCode(r)}if(a!=64){t=t+String.fromCharCode(i)}}t=Base64._utf8_decode(t);return t},
    _utf8_encode:function(e){e=e.replace(/\r\n/g,"\n");var t="";for(var n=0;n<e.length;n++){var r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r)}else if(r>127&&r<2048){t+=String.fromCharCode(r>>6|192);t+=String.fromCharCode(r&63|128)}else{t+=String.fromCharCode(r>>12|224);t+=String.fromCharCode(r>>6&63|128);t+=String.fromCharCode(r&63|128)}}return t},
    _utf8_decode:function(e){var t="";var n=0;var r=c1=c2=0;while(n<e.length){r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r);n++}else if(r>191&&r<224){c2=e.charCodeAt(n+1);t+=String.fromCharCode((r&31)<<6|c2&63);n+=2}else{c2=e.charCodeAt(n+1);c3=e.charCodeAt(n+2);t+=String.fromCharCode((r&15)<<12|(c2&63)<<6|c3&63);n+=3}}return t}
}


function inherits (ctor, superCtor) {
    Object.defineProperty(ctor, "super_", {
        value: superCtor,
        enumerable: false,
        writable: false,
        configurable: false
    });
    ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
            value: ctor,
            enumerable: false,
            writable: true,
            configurable: true
        }
    });
}

function in_array (array, value) {
    return -1 !== array.indexOf(value);
}

function is_function (func) {
    return !!(func && func.constructor && func.call && func.apply);
}

function has_key (obj, key) {
    return -1 !== Object.keys(obj).indexOf(key);
}

function get_values (obj) {
    var res = [];

    Object.keys(obj).forEach(function (key) {
        res.push(obj[key]);
    });

    return res;
}


// init WebServer

function WebServerRequestHandler(req) {
	var q = req.url.substring(1).replace(/\//g, '.');
	if (!q) return null;
	
	var found = null;
	if (this.externalNames.some(function(ext) {
		found = ext;
		return (ext.length < q.length && q.slice(0, ext.length + 1) === ext + ".") || (ext === q);
	}) && found) {
		var cache = this.evalCache || (this.evalCache = {});
		var handler = cache[found] || (cache[found] = evalPath(found));
		return handler(req.url.substring(found.length + 1), req);
	}
	
	return null;
}

ws = new WebServer(8083, WebServerRequestHandler, {
	document_root: "htdocs"
});

ws.externalNames = [];
ws.allowExternalAccess = function(name) {
	// refresh cache anyways, even if adding duplicate name
	if (this.evalCache)
		delete this.evalCache[name];

	var idx = this.externalNames.indexOf(name);
	if (idx >= 0) return;
	
	this.externalNames.push(name);
	this.externalNames.sort(function(x, y) {
		return (y.length - x.length) || (x > y ? 1 : -1);
	});
};
ws.revokeExternalAccess = function(name) {
	// remove cached handler (if any)
	if (this.evalCache)
		delete this.evalCache[name];

	var idx = this.externalNames.indexOf(name);
	if (idx === -1) return;
	
	this.externalNames.splice(idx, 1);
};

//--- Init JS handler

JS = function() {
    return { status: 400, body: "Bad JS request" };
};
ws.allowExternalAccess("JS");

JS.Run = function(url) {
	// skip trailing slash
    url = url.substring(1);
    try {
    	var r = eval(url);
        if (typeof r === "function") {
            // special case for functions, otherwise they show up as JSON 'null'
            return {
                status: 204,
                headers: {
                    "Content-Type": "application/json",
                    "Connection": "keep-alive"
                }
            }
        }

    	return { 
    		status: 200, 
    		headers: { 
    			"Content-Type": "application/json",
    			"Connection": "keep-alive"
    		},
    		body: JSON.stringify(r)
    	};
    } catch (e) {
    	return { status: 500, body: e.toString() };
    }
};
ws.allowExternalAccess("JS.Run");

JS.Load_Module_Media = function(url) {
     var u = url.substring(1),
     path = u.split("/"),
     img = ["png","jpg","jpeg","JPG","JPEG","gif"],
     text = ["css","htm","html","shtml","js","txt","rtf","xml"],
     video = ["mpeg","mpg","mpe","qt","mov","viv","vivo","avi","movie","mp4"],
     e = url.split("."),
     fe, ct, mn, dat;

     if( path.length === 1 || ( path[0] === "" && path.length === 2 ) ) {
        mn = "";
        dat = "";
    } else {
        mn = path.shift();
        dat = path.pop();
    }

    if( e.length === 1 || ( e[0] === "" && e.length === 2 ) ) {
        fe = "";
    } else {
        fe = e.pop();
    }

    if(img.indexOf(fe) > -1){
        ct = "image/(png|jpeg|gif)";
    }
    
    if(text.indexOf(fe) > -1){
        ct = "text/(css|html|javascript|plain|rtf|xml)";
    }

    if(video.indexOf(fe) > -1){
        ct = "video/(mpeg|quicktime|vnd.vivo|x-msvideo|x-sgi-movie|mp4)";
    }

    try {
        try{
            var data = fs.load('userModules/' + mn + '/htdocs/' + dat);
        } catch(e){
            var data = fs.load('modules/' +mn+ '/htdocs/' + dat);
        }
        return { 
            status: 200, 
            headers: { 
                "Content-Type": ct,
                "Connection": "keep-alive"
            },
            body: data
        };
    } catch (e) {
        return { 
            status: 404, 
            body: e.toString() 
        };
    }
};
ws.allowExternalAccess("JS.Load_Module_Media");

JS.Load_Image = function(url) {
    var u = url.substring(1),
        split = url.split('/'),
        data;

    try {
        var img = loadObject(u);
        data = Base64.decode(img);
        
        return { 
            status: 200, 
            headers: { 
                "Content-Type": "image/(png|jpeg|gif)",
                "Connection": "keep-alive"
            },
            body: data
        };
    } catch (e) {
        return { 
            status: 404, 
            body: e.toString() 
        };
    }
};
ws.allowExternalAccess("JS.Load_Image");

JS.Upload_Image = function(url, request) {
    if (request.method === "POST" && request.data.file_upload) {
        var file = request.data.file_upload;
        if (file instanceof Array) {
            file = file[0];
        }
        if (file.name && file.content && file.length > 0) {

            // Create Base64 Object

            saveObject(file.name, Base64.encode(file.content));

            try {                
                return {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                        "Connection": "keep-alive"
                    },
                    body: {
                        img: file.name
                    }
                };
            } catch (e) {
                return {
                    status: 500, 
                    body: e.toString()
                };
            }
        }
    }
    return { 
        status: 400, 
        body: "Invalid request" 
    };
};
ws.allowExternalAccess("JS.Upload_Image");


// do transition script to adopt old versions to new
executeFile("updateBackendConfig.js");

//--- Load configuration
var config, files, templates, schemas, modules, namespaces;
try {
    config = loadObject("config.json") || {
        "controller": {},
        "vdevInfo": {},
        "locations": []
    };
    files = loadObject("files.json") || {};
    schemas = loadObject("schemas.json") || [];
} catch (ex) {
    console.log("Error loading config.json or files.json:", ex.message);
}

if (!config) {
    console.log("Can't read config.json or it's broken.");
    console.log("ZAutomation engine not started.");
} else {
    config.libPath = "lib";
    config.classesPath = "classes";
    config.resourcesPath = "res";

    // temp: add modules_categories
    config.modules_categories = [
        {
            "id": "automation",
            "name": "Automation",
            "description": "Create home automation rules",
            "icon": ""
        },
        {
            "id": "security",
            "name": "Security",
            "description": "Enhance security",
            "icon": ""
        },
        {
            "id": "peripherals",
            "name": "Peripherals",
            "description": "Z-Wave and other peripherals",
            "icon": ""
        },
        {
            "id": "surveillance",
            "name": "Video surveillance",
            "description": "Support for cameras",
            "icon": ""
        },
        {
            "id": "logging",
            "name": "Data logging",
            "description": "Logging to third party services",
            "icon": ""
        },
        {
            "id": "scripting",
            "name": "Scripting",
            "description": "Create custom scripts",
            "icon": ""
        },
        {
            "id": "devices",
            "name": "Devices",
            "description": "Create devices",
            "icon": ""
        },
        {
            "id": "scheduling",
            "name": "Schedulers",
            "description": "Time related functions",
            "icon": ""
        },
        {
            "id": "climate",
            "name": "Climate",
            "description": "Climate control",
            "icon": ""
        },
        {
            "id": "environment",
            "name": "Environment",
            "description": "Environment related date",
            "icon": ""
        },
        {
            "id": "scenes",
            "name": "Scenes",
            "description": "Light scenes",
            "icon": ""
        },
        {
            "id": "notifications",
            "name": "Notifications",
            "description": "SMS, E-mail and push notifications",
            "icon": ""
        },
        {
            "id": "tagging",
            "name": "Tagging",
            "description": "Tagging widgets",
            "icon": ""
        }
    ];

    //--- Load 3d-party dependencies
    executeFile(config.libPath + "/eventemitter2.js");
    executeFile(config.libPath + "/underscore.js");
    executeFile('system/server.js');

    //--- Load Automation subsystem classes
    executeFile(config.classesPath + "/VirtualDevice.js");
    executeFile(config.classesPath + "/DevicesCollection.js");
    executeFile(config.classesPath + "/AutomationController.js");
    executeFile(config.classesPath + "/AuthorizationController.js");
    executeFile(config.classesPath + "/AutomationModule.js");
    executeFile("request.js");
    executeFile("webserver.js");
    executeFile("storage.js");

    //--- Instantiate Automation Controller

    var api = null,
        storage = null,
        controller = new AutomationController(config);

    controller.on('core.init', function () {
        console.log('Starting ZWay Automation webserver');
    });

    controller.on('core.start', function () {
        console.log('ZWay Automation started');
    });

    controller.on('core.stop', function () {
        console.log('ZWay Automation stopped');
    });

    controller.on('core.error', function (err) {
        console.log("--- ERROR:", err.message);
        controller.addNotification("error", err.message, "core", "core controller");
    });

    //--- main
    controller.init();
    controller.start();
}
