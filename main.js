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
__storageContent = loadObject("__storageContent") || [];

// check against storage if listed files really exists
__storageContent = __storageContent.filter(function(name) {
	return !!loadObject(name);
});

saveObject = function(name, object) {
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
	executeFile(config.libPath + "/qrcode.js");
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
