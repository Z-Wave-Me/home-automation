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
    console.log("Please, provide correct config.json (look at the config-sample.json for reference) and restart service.");
    console.log("ZAutomation engine not started.");
} else {
    config.libPath = "lib";
    config.classesPath = "classes";
    config.resourcesPath = "res";

    //--- Load 3d-party dependencies

    executeFile(config.libPath + "/eventemitter2.js");
    executeFile(config.libPath + "/underscore-min.js");

    //--- Load router
    //executeFile(config.libPath + "/Router.js");

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
}
