var path = require("path");
var fs = require("fs");

AutomationModule = function (id, controller, config) {
    this.id = id;
    this.controller = controller;
    this.init(config);
};

module.exports = exports = AutomationModule;

AutomationModule.prototype.init = function (config) {
    // TODO: Apply default configuration patched with incomming options
    this.config = config;
};

AutomationModule.prototype.getModuleBasePath = function () {
    return ".";
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
