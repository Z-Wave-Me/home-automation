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
    ctor.super_ = superCtor;
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

function actualize (config) {

    console.log('Actualizing config');

    // profiles
    if (config.hasOwnProperty('profiles')) {
        if (config.profiles.length > 0) {
            config.profiles.forEach(function (profile) {
                if (!_.isObject(profile.groups) || !profile.groups.hasOwnProperty('instances')) {
                    profile.groups = {instances: {}}
                }

                if (_.isArray(profile.positions)) {
                    profile.positions = _.filter(profile.positions, function (position) {
                        return _.isString(position);
                    });
                } else {
                    profile.positions = [];
                }

            });
        }
    }

    return config;
}

//--- Init JS handler

allowExternalAccess("JS");
allowExternalAccess("JS.Run");

JS = function() {
    return { status: 400, body: "Bad JS request" };
};

JS.Run = function(url) {
	// skip trailing slash
    url = url.substring(1);
    try {
    	var r = executeJS(url, "JS/Run");
    	return { 
    		status: 200, 
    		headers: { 
    			"Content-Type": "application/json",
    			"Connection": "keep-alive"
    		},
    		body: r 
    	};
    } catch (e) {
    	return { status: 500, body: e };
    }
};

//--- Init ZWaveAPI handler

allowExternalAccess("ZWaveAPI");
allowExternalAccess("ZWaveAPI.Run");
allowExternalAccess("ZWaveAPI.Data");
allowExternalAccess("ZWaveAPI.InspectQueue");
allowExternalAccess("ZWaveAPI.Backup");
allowExternalAccess("ZWaveAPI.Restore");

ZWaveAPI = function() {
    return { status: 400, body: "Bad ZWaveAPI request" };
};

ZWaveAPI.Run = function(url) {
    url = "zway." + url.substring(1);
    try {
    	var r = executeJS(url);
    	return { 
    		status: 200, 
    		headers: { 
    			"Content-Type": "application/json",
    			"Connection": "keep-alive"
    		},
    		body: r 
    	};
    } catch (e) {
    	return { status: 500, body: e };
    }
};

ZWaveAPI.Data = function(url) {
	var timestamp = parseInt(url.substring(1)) || 0;
	return {
		status: 200,
		headers: { 
			"Content-Type": "application/json",
			"Connection": "keep-alive"
		},
		body: zway.data(timestamp)    	
	};
}

ZWaveAPI.InspectQueue = function(url) {
	return {
		status: 200,
		headers: { 
			"Content-Type": "application/json",
			"Connection": "keep-alive"
		},
		body: zway.InspectQueue()    	
	};
}

ZWaveAPI.Backup = function(url) {
	return { status: 400, body: "Not implemented yet" };
}

ZWaveAPI.Restore = function(url) {
	return { status: 400, body: "Not implemented yet" };
}

// init WebServer

function WebServerRequestHandler(req) {
	var q = req.url.substring(1).replace(/\//g, '.');
	if (!q) return null;
	
	var found = null;
	if (listExternalAccess().some(function(ext) {
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
	document_root: "htdocs",
	enable_proxy: "yes"
});

// init HomeKit (for testing)

hk = new HomeKit("RaZberry", function(r) {
    if (r.method == "GET" && r.path == "/accessories") {
        return this.accessories.serialize(r);
    } else if (r.method == "PUT" && r.path == "/characteristics" && r.data && r.data.characteristics) {
        r.data.characteristics.forEach(function (c) {
            if (typeof c.value !== "undefined") {   
                // use c.aid, c.iid and c.value here
                var characteristic = this.accessories.find(c.aid, c.iid);
                if (characteristic)
                    characteristic.value = c.value;

                // update subscribers
                this.update(c.aid, c.iid);
            }                          
                                       
            if (typeof c.events === "boolean") { 
                // set event subscription state  
                r.events(c.aid, c.iid, c.events);
            }
        }, this);
        return null; // 204
    } else if (r.method == "GET" && r.path.substring(0, 20) == "/characteristics?id=") {
        var ids = r.path.substring(20).split('.').map(function(x) { return parseInt(x) });

        var characteristic = this.accessories.find(ids[0], ids[1]);
        if (characteristic) {
            return {
                characteristics: [
                    { aid: ids[0], iid: ids[1], value: characteristic.value }
                ]
            };
        }
    }
});

hk.accessories = new HKAccessoryCollection(hk);

with (hk.accessories) {
    with(addAccessory("RaZberry", "z-wave.me", "ZME-RAZ01-EU", "ZMERAZ01EU12345")) {
        with (addService(HomeKit.Services.Lightbulb, "Bedroom")) {
            addCharacteristic(HomeKit.Characteristics.PowerState, "bool", {
                get: function() { return true; },
                set: function(value) { debugPrint(value); }
            });
            with (addCharacteristic(HomeKit.Characteristics.Brightness, "float", 50, [ "pr", "pw" ])) {
                minValue = 1;
                maxValue = 100;
                minStep = 5;   
            };
        };
    };
};   
     
console.log(hk.name, "PIN:", hk.pin);


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

    //--- Load 3d-party dependencies

    executeFile(config.libPath + "/eventemitter2.js");
    executeFile(config.libPath + "/underscore-min.js");

    //---  Actualization config
    config = actualize(config);

    executeFile(config.classesPath + "/VirtualDevice.js");

    //--- Load Automation subsystem classes
    executeFile(config.classesPath + "/DevicesCollection.js");
    executeFile(config.classesPath + "/AutomationController.js");
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
        controller.addNotification("error", err.message, "core");
    });

    //--- main
    controller.init();
    controller.start();

    //--- load Z-Way utilities
    (fs.list("z-way-utils/") || []).forEach(function (file) {
        try {
            executeFile("z-way-utils/" + file);
        } catch (e) {
            controller.addNotification("error", "Can not load z-way-utils file (" + file + "): " + e.toString(), "core");
            console.log(e.stack);
        }
    });
}
