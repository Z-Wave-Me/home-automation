function AutomationController (config) {
    AutomationController.super_.call(this);

    this.config = config;

    this.modules = {};
    this.instances = {};

    this.devices = {};
    this.widgets = {};
    this.apps = {};
}

inherits(AutomationController, EventEmitter2);

AutomationController.prototype.init = function () {
    var self = this;

    this.loadModules(function () {
        self.instantiateModules();
    });

    this.emit("init");
};

AutomationController.prototype.run = function () {
    this.emit("run");
};

AutomationController.prototype.stop = function () {
    this.emit("stop");
};

AutomationController.prototype.loadModules = function (callback) {
    var self = this;

    this.config.modules.forEach(function (moduleClassName) {
        // Load module class
        var moduleFilename = self.config.modulesPath + "/" + moduleClassName + "/index.js";
        console.log("Loading module " + moduleClassName + " from " + moduleFilename);
        executeFile(moduleFilename);

        // Monkey-patch module with basePath method
        _module.prototype.moduleBasePath = function () {
            return self.config.modulesPath + "/" + moduleClassName;
        };

        // Grab _module and clear it out
        self.modules[moduleClassName] = _module;
        _module = undefined;
    });

    if (callback) callback();
};

AutomationController.prototype.instantiateModules = function () {
    var self = this;
    if (this.config.hasOwnProperty('instances')) {
        Object.keys(this.config.instances).forEach(function (instanceId) {
            console.log("--- Instantiating ", instanceId);
            var instanceDefs = self.config.instances[instanceId];
            var moduleClass = self.modules[instanceDefs.module];
            var instance = new moduleClass(instanceId, self);
            self.instances[instanceId] = instance;
            instance.init(instanceDefs.config);
            var instanceMeta = instance.getMeta();
            self.emit('moduleInstanceStarted', instanceId);
        });
    }
};

AutomationController.prototype.moduleInstance = function (instanceId) {
    return this.instances.hasOwnProperty(instanceId) ? this.instances[instanceId] : null;
};

AutomationController.prototype.registerAction = function (instanceId, meta, func) {
    console.log("registerAction", instanceId, meta);
    var instance = this.instances[instanceId];
    instance.actions[meta.id] = meta;
    instance.actionFuncs[meta.id] = func;
    this.emit('actionRegistered', instanceId, meta.id);
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
