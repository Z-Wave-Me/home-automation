var path = require("path");
var fs = require("fs");

AutomationModule = function (id, controller) {
    this.id = id;
    this.actions = {};
    this.actionFuncs = {};
    this.metrics = {};
    this.config = {};
    this.controller = controller;
};

module.exports = exports = AutomationModule;

AutomationModule.prototype.init = function (config) {
    var self = this;
    Object.keys(config).forEach(function (key) {
        self.config[key] = config[key];
    });
};

AutomationModule.prototype.getModuleBasePath = function () {
    return ".";
};

AutomationModule.prototype.runAction = function (meta, args, callback) {
    this.actionFuncs[meta.id](args, callback);
};

AutomationModule.prototype.getResource = function (name) {
    var resourceFilename = path.resolve(path.join(this.getModuleBasePath(), "resources", name));
    return fs.existsSync(resourceFilename) ? resourceFilename : this.controller.getResource(name);
};

AutomationModule.prototype.getMeta = function () {
    return require("./module.js");
    // var resourceFilename = path.resolve(path.join(this.getModuleBasePath(), "resources", name));
    // return fs.existsSync(resourceFilename) ? resourceFilename : this.controller.getResource(name);
};

AutomationModule.prototype.getModuleInstanceMetrics = function () {
    return null;
};
