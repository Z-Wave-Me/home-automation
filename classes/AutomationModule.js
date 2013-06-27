AutomationModule = function (id, controller) {
    this.id = id;
    this.actions = {};
    this.actionFuncs = {};
    this.metrics = {};
    this.config = {};
    this.controller = controller;

    // Proxy EventEmitter.emit from the AutomationController
    // FIX: This doesn't work. Find out why!
    this.emit = this.controller.emit;
};

AutomationModule.prototype.init = function (config) {
    var self = this;
    Object.keys(config).forEach(function (key) {
        self.config[key] = config[key];
    });
};

AutomationModule.prototype.getModuleBasePath = function () {
    return ".";
};

AutomationModule.prototype.runAction = function (actionId, args, callback) {
    this.actionFuncs[actionId].call(this, args, callback);
};

AutomationModule.prototype.getResource = function (name) {
    var resourceFilename = path.resolve(path.join(this.getModuleBasePath(), "resources", name));
    return fs.existsSync(resourceFilename) ? resourceFilename : this.controller.getResource(name);
};

AutomationModule.prototype.getMeta = function () {
    return loadJSON(this.getModuleBasePath()+"/module.json");
};

AutomationModule.prototype.getModuleInstanceMetrics = function () {
    return null;
};
