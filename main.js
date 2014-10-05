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
                if (profile.hasOwnProperty('groups')) {
                    delete profile.groups;
                }

                if (profile.hasOwnProperty('active')) {
                    delete profile.active;
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

    // instances
    if (config.hasOwnProperty('instances')) {
        if (config.instances.length > 0) {
            config.instances.forEach(function (instance) {
                // move title and description params
                instance.title = instance.params.title;
                instance.description = instance.params.description;
                delete instance.params.title;
                delete instance.params.description;

                // move status
                if (instance.params.hasOwnProperty('status')) {
                    instance.active = instance.params.status === 'enable';
                    delete instance.params.status;
                } else if (!instance.hasOwnProperty('active')) {
                    instance.active = true;
                }

                // delete userView
                if (instance.hasOwnProperty('userView')) {
                    delete instance.userView;
                }
            });
        }
    }

    // add local modules_categories
    // TODO: temp data.
    if (!config.hasOwnProperty('modules_categories')) {
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
                "name": "Video surevillance",
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
    	return { status: 500, body: e.toString() };
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
    	return { status: 500, body: e.toString() };
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
	var now = new Date();
	
	// create a timestamp in format yyyy-MM-dd-HH-mm
	var ts = now.getFullYear() + "-";
	ts += ("0" + (now.getMonth()+1)).slice(-2) + "-";
	ts += ("0" + now.getDate()).slice(-2) + "-";
	ts += ("0" + now.getHours()).slice(-2) + "-";
	ts += ("0" + now.getMinutes()).slice(-2);
	
	try {
		var data = zway.controller.Backup();
		return {
			status: 200,
			headers: {
				"Content-Type": "application/x-download",
				"Content-Disposition": "attachment; filename=z-way-backup-" + ts + ".zbk",
				"Connection": "keep-alive"
			},
			body: data
		}
	} catch (e) {
		return { status: 500, body: e.toString() };
	}
}

ZWaveAPI.Restore = function(url, request) {
	if (request.method == "POST" && request.data && request.data && request.data.config_backup) {
		var full = false;
		if (request.query && request.query.hasOwnProperty("restore_chip_info")) {
			var rci = request.query["restore_chip_info"];
			full = (rci == "yes" || rci == "true" || rci == "1");
		}
		
		var file = request.data.config_backup;
		if (file instanceof Array)
			file = file[0];
		if (file.name && file.content && file.length > 0) {
			// valid file object detected
			try {
				zway.controller.Restore(file.content, full);
				return {
					status: 200,
					headers: {
						"Content-Type": "application/json",
						"Connection": "keep-alive"
					},
					body: null
				}
			} catch (e) {
				return { status: 500, body: e.toString() };
			}
		}
	}
	return { status: 400, body: "Invalid request" };
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
	document_root: "htdocs"
});

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
    if (typeof zway !== "undefined") {
        (fs.list("z-way-utils/") || []).forEach(function (file) {
            try {
                executeFile("z-way-utils/" + file);
            } catch (e) {
                controller.addNotification("error", "Can not load z-way-utils file (" + file + "): " + e.toString(), "core");
                console.log(e.stack);
            }
        });
    } else {
        console.log("Z-Way object is not loaded. Skipping Z-Way Utilities");
    }
}
