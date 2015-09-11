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

    // add modules_categories
    config.modules_categories = fs.loadJSON("modulesCategories.json");

    //--- Load 3d-party dependencies
    executeFile(config.libPath + "/eventemitter2.js");
    executeFile(config.libPath + "/underscore.js");

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
            return { status: 500, body: e.toString() };
        }
    };
    ws.allowExternalAccess("JS.Run", controller.auth.ROLE.ADMIN);
}
