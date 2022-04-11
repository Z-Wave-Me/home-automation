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

// load utilities
executeFile("Utils.js");

// do transition script to adopt old versions to new
executeFile("updateBackendConfig.js");

// overload saveObject to allow backup/restore of all JSON files in storage
__saveObject = saveObject;
__saveObjectTimer = {};
__storageContent = loadObject("__storageContent") || [];

// check against storage if listed files really exists
__storageContent = __storageContent.filter(function(name) {
	try {
		return !!loadObject(name);
	} catch (e) {
		console.log("Error loading " + name + " from storage: JSON file corrupted: " + e.toString());
		return false;
	}
});

// Saves object as name, adds name to the storageContent.
// Defer save: immediate can be undefined (to use default seconds), true or 0 (save now), integer (to defer by N seconds)
saveObject = function(name, object, immediate) {
	// defer tests
	
	var deferTime;
	
	if (immediate === true || immediate === 0) {
		deferTime = 0;
	} else if (immediate > 0) {
		deferTime = immediate;
	} else {
		deferTime = 5 * 60;
	}
	deferTime *= 1000;
	
	if (!__saveObjectTimer[name]) {
		__saveObjectTimer[name] = {
			timer: null,
			lastSave: 0
		};
	}
	
	if (__saveObjectTimer[name].timer) {
		clearTimeout(__saveObjectTimer[name].timer);
		__saveObjectTimer[name].timer = null;
	}
	
	deferTime -= Date.now() - __saveObjectTimer[name].lastSave;
	if (deferTime > 0) {
		// restart the time with the new object and remaining time
		__saveObjectTimer[name].object = object;
		__saveObjectTimer[name].saver = function() {
			__saveObjectTimer[name].timer = null;
			__saveObjectTimer[name].saver = null;
			saveObject(name, __saveObjectTimer[name].object, true); // call itself
		};
		__saveObjectTimer[name].timer = setTimeout(__saveObjectTimer[name].saver, deferTime);
		
		return; // defer save
	}
	
	__saveObjectTimer[name].lastSave = Date.now();
	
	// add entry to __storageContent if it does not already exist
	if (__storageContent.indexOf(name) === -1 && !!name) {
		__storageContent.push(name);
		__saveObject("__storageContent", __storageContent);

	// remove entry from __storageContent if deleted
	} else if (!!name && object === null) {
		__storageContent = _.filter(__storageContent, function(fileName){
			return fileName !== name;
		});
		__saveObject("__storageContent", __storageContent);
	}

	__saveObject(name, object);
};

function __saveObjectsNow() {
	for (var name in __saveObjectTimer) {
		if (__saveObjectTimer[name].timer != null && __saveObjectTimer[name].saver != null)
		{
			clearTimeout(__saveObjectTimer[name].timer);
			__saveObjectTimer[name].timer = null;
			__saveObjectTimer[name].saver();
			__saveObjectTimer[name].saver = null;
		}
	}
}

//--- Load configuration
var config, files, templates, schemas, modules, namespaces;
try {
	config = loadObject("config.json");
	files = loadObject("files.json") || {};
	schemas = loadObject("schemas.json") || [];
} catch (ex) {
	console.log("Error loading config.json or files.json:", ex.message);
}

if (!config && config === null) {
	console.log("Can't read config.json or it's broken.");
	console.log("ZAutomation engine not started.");
} else {
	config.libPath = "lib";
	config.classesPath = "classes";
	config.resourcesPath = "res";

	// add modules_categories
	config.modules_categories = fs.loadJSON("modulesCategories.json");

	//--- Load 3d-party dependencies
	executeFile(config.libPath + "/eventemitter2.js");
	executeFile(config.libPath + "/underscore.js");
	executeFile(config.libPath + "/papaparse.min.js");
	executeFile(config.libPath + "/zlib_and_gzip.min.js"); // TODO Test!
	executeFile(config.libPath + "/BAOS_API_2011_01_29_001.js");
	executeFile(config.libPath + "/IntelHex2bin.js");
	executeFile(config.libPath + "/base64.js");
	executeFile(config.libPath + "/LimitedArray.js");
	//--- Load Automation subsystem classes
	executeFile(config.classesPath + "/VirtualDevice.js");
	executeFile(config.classesPath + "/DevicesCollection.js");
	executeFile(config.classesPath + "/AutomationController.js");
	executeFile(config.classesPath + "/AuthController.js");
	executeFile(config.classesPath + "/AutomationModule.js");
	executeFile("Webserver.js");
	executeFile("WebserverRequestRouter.js");
	executeFile("ZAutomationAPIProvider.js");
	executeFile("StorageProvider.js");

	//--- Instantiate Automation Controller

	var api = null,
		storage = null,
		controller = new AutomationController(config),
		now = new Date();

	controller.on('core.init', function () {
		console.log('Starting ZWay Automation webserver');
		// first start up
		config.controller.first_start_up = !config.controller.first_start_up? now : config.controller.first_start_up;
		// count server restarts
		config.controller.count_of_reconnects = config.controller.count_of_reconnects? parseInt(config.controller.count_of_reconnects, 10) + 1 : 1;
		
		// generate the uuid
		if (!config.controller.uuid) config.controller.uuid = crypto.guid();
		if (!config.controller.serial) config.controller.serial = config.controller.uuid;
	});

	controller.on('core.start', function () {
		console.log('ZWay Automation started');
	});

	controller.on('core.stop', function () {
		__saveObjectsNow()
		console.log('ZWay Automation stopped');
	});

	controller.on('core.error', function (err) {
		console.log("--- ERROR:", err.message);
		controller.addNotification("error", err.message, "core", "core controller");
	});

	//--- main
	controller.init();
	controller.start();

	//--- Init JS handler for Admin

	JS = function() {
		return { status: 400, body: "Bad JS request" };
	};
	ws.allowExternalAccess("JS", controller.auth.ROLE.ADMIN);

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
						"Content-Type": "application/json"
					}
				}
			}

			return {
					status: 200,
					headers: {
							"Content-Type": "application/json"
					},
					body: JSON.stringify(r)
			};
		} catch (e) {
			console.log("Error handling request " + url + ": " + e.toString());
			return { status: 500, body: e.toString() };
		}
	};
	ws.allowExternalAccess("JS.Run", controller.auth.ROLE.ADMIN);

	// overwrite console.debug function
	console.debug = function(){
		var arr = [];

		// use JS API /JS/Run/controller.debug=true / false to activate debug output
		if (controller.debug){
			for (var key in arguments) {
				var arg = '';

				//format objects automatically
				if (typeof arguments[key] === 'object' && !!arguments[key]) {
					arg = JSON.stringify(arguments[key], null, 4);
				} else {
					arg = arguments[key];
				}
				arr.push(arg);
			}

			debugPrint(arr);
		}
	};
}
