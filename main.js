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
