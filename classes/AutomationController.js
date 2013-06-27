// var util = require("util");
// var EventEmitter2 = require('eventemitter2').EventEmitter2;
// var fs = require("fs");
// var path = require("path");

function AutomationController (config) {
    AutomationController.super_.call(this);

    this.config = config;
    this.globalTimer = null;

    // this.zones = {};
    // this.tags = {};

    this.modules = {};
    this.instances = {};
    this.devices = {};
    this.widgets = {};
    this.apps = {};

    this.enabledApps = [];
    this.enabledWidgets = [];
}

inherits(AutomationController, EventEmitter2);

// module.exports = exports = AutomationController;

AutomationController.prototype.init = function () {
    var self = this;

    this.loadModules(function () {
        self.instantiateModules();
    });

    // this.enabledWidgets = this.config.enabledWidgets;
    // this.enabledApps = this.config.enabledApps;

    this.emit("init");
};

AutomationController.prototype.run = function () {
    var self = this;

    // this.globalTimer = setInterval(function () {
    //     self.emit("tick");
    // }, this.config.tickInterval);
    // console.log("Global timer set");

    this.emit("run");
};

AutomationController.prototype.stop = function () {
    clearInterval(this.globalTimer);
    this.emit("stop");
};

AutomationController.prototype.loadModules = function (callback) {
    var self = this;

    this.config.modules.forEach(function (moduleId) {
        var moduleFilename = self.config.modulesPath + "/" + moduleId + "/index.js";
        console.log("Loading module " + moduleId + " from " + moduleFilename);
        executeFile(moduleFilename);
        self.modules[moduleId] = _module;
    });

    if (callback) callback();
};

AutomationController.prototype.instantiateModules = function () {
    var self = this;
    if (this.config.hasOwnProperty('instances')) {
        Object.keys(this.config.instances).forEach(function (moduleId) {
            var instanceDefs = self.config.instances[moduleId];
            var moduleClass = self.modules[instanceDefs.module];
            var instance = new moduleClass(moduleId, self);
            self.instances[moduleId] = instance;
            instance.init(instanceDefs.config);
            self.emit('moduleInstanceStarted', moduleId);
        });
    }
};

AutomationController.prototype.registerAction = function (instanceId, meta, func) {
    console.log("registerAction", instanceId, meta);
    var instance = this.instances[instanceId];
    instance.actions[meta.id] = meta;
    instance.actionFuncs[meta.id] = func;
    this.emit('actionRegistered', instanceId, meta.id);
};

AutomationController.prototype.getResource = function (name) {
    var resourcesPath = path.resolve(path.join(__dirname, "..", "resources"));
    var resourceFilename = path.join(resourcesPath, name);
    return fs.existsSync(resourceFilename) ? resourceFilename : false;
};

AutomationController.prototype.registerDevice = function (deviceId, moduleInstance) {
    this.devices[deviceId] = moduleInstance;
    this.emit('deviceRegistered', deviceId);
};

AutomationController.prototype.registerWidget = function (deviceId, meta) {
    this.widgets[deviceId] = meta;
    this.emit('widgetRegistered', deviceId);
};

AutomationController.prototype.registerApp = function (moduleInstanceId, meta) {
    this.apps[moduleInstanceId] = meta;
    this.emit('appRegistered', moduleInstanceId);
};

AutomationController.prototype.getEnabledWidgets = function () {
    return this.enabledWidgets;
};
