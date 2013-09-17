/******************************************************************************

 Z-Way Home Automation Engine
 main executable
 Version: 0.1.1
 (c) ZWave.Me, 2013

 -----------------------------------------------------------------------------
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
    debug: debugPrint
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

// Array.prototype.has = function (value) {
//     return -1 != this.indexOf(value);
// };

function in_array (array, value) {
    return -1 != array.indexOf(value);
}

// Object.prototype.hasKey = function (value) {
//     return -1 != Object.keys(this).indexOf(value);
// };

function has_key (obj, key) {
    return -1 != Object.keys(obj).indexOf(key);
}

//--- Load configuration

var config = loadJSON("./config.json");

console.log("--- CONFIG", config);

config.libPath = "lib";
config.classesPath = "classes";
config.resourcesPath = "res";

console.log("CFG", JSON.stringify(config, null, "  "));

//--- Load constants & 3d-party dependencies

executeFile("constants.js");

executeFile(config.libPath + "/eventemitter2.js");

//--- Load Automation subsystem classes

executeFile(config.classesPath+"/AutomationController.js");
executeFile(config.classesPath+"/AutomationModule.js");
executeFile(config.classesPath+"/VirtualDevice.js");

//--- Instantiate Automation Controller

var controller = new AutomationController(config.controller);

controller.on('init', function () {
    controller.run();
});

controller.on('error', function (err) {
    console.log("--- ERROR:", err.message);
});

controller.on('run', function () {
    console.log('ZWay Automation Controller started');

    //--- Initialize webserver
    executeFile("/webserver.js");
});

//--- main

controller.init();
