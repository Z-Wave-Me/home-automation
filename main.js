//--- Define global variables and helpers

var window = global = this;

var console = {
    log: debugPrint,
    warn: debugPrint,
    error: debugPrint,
    debug: debugPrint
}

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

// Object.prototype.isArray = function () {
//     return this instanceof Array;
// }

//--- Load configuration

var config = loadJSON("./automation/config.json");

config.libPath = config.basePath+"/lib";
config.classesPath = config.basePath+"/classes";
config.resourcesPath = config.basePath+"/res";

console.log("CFG", JSON.stringify(config, null, "  "));

//--- Load constants & 3d-party dependencies

executeFile(config.basePath+"/constants.js");

executeFile(config.libPath + "/eventemitter2.js");

//--- Load Automation subsystem classes

executeFile(config.classesPath+"/AutomationController.js");
executeFile(config.classesPath+"/AutomationModule.js");

//--- Instantiate Automation Controller

var controller = new AutomationController(config.controller);

controller.on('init', function () {
    controller.run();
});

controller.on('error', function (err) {
    console.log("--- ERROR:", err.message);
});

controller.on('deviceRegistered', function (id) {
    console.log("Device registered", id);
});

controller.on('actionRegistered', function (id, name) {
    console.log("Action registered", id, name);
});

controller.on('widgetRegistered', function (id) {
    console.log("Widget registered", id);
});

controller.on('run', function () {
    console.log('ZWay Automation Controller started');

    //--- Initialize webserver
    executeFile(config.basePath+"/webserver.js");
});

//--- main

controller.init();
