function AutomationController (config) {
    AutomationController.super_.call(this);

    this.config = config;

    this.modules = {};
    this.instances = {};
    this.devices = {};
    this.widgets = {};
}

inherits(AutomationController, EventEmitter2);

AutomationController.prototype.init = function () {
    var self = this;

    this.on('instance.register', this.registerInstance);
    this.on('instance.registerAction', this.registerAction);
    this.on('instance.remove', this.removeInstance);
    this.on('instance.list', this.listInstances);

    this.on('devices.register', this.registerDevice);
    this.on('devices.remove', this.removeDevice);
    this.on('devices.list', this.listDevices);

    this.on('widgets.register', this.registerWidget);
    this.on('widgets.remove', this.removeWidget);
    this.on('widgets.list', this.listWidgets);

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
            var instanceDefs = self.config.instances[instanceId];
            var moduleClass = self.modules[instanceDefs.module];
            var instance = new moduleClass(instanceId, self);
            self.emit('core.registerInstance', instanceId, instance);
            instance.init(instanceDefs.config);
        });
    }
};

AutomationController.prototype.moduleInstance = function (instanceId) {
    return this.instances.hasOwnProperty(instanceId) ? this.instances[instanceId] : null;
};

AutomationController.prototype.listInstances = function () {
    // TODO: Construct proper list for exporting
    this.emit('core.instancesList', this.instances);
};

AutomationController.prototype.registerInstance = function (instanceId, instance) {
    if (!this.modules.hasOwnProperty(instanceId)) {
        if (!!instance) {
            this.instances[instanceId] = instance;
            this.emit('core.instanceRegistered', instanceId);
        } else {
            this.emit('error', new Error("Can't register empty module instance "+instanceId));
        }
    } else {
        this.emit('error', new Error("Can't register module instance "+instanceId+" twice"));
    }
};

// TODO: Refactor to the module instance's routine getActions()
AutomationController.prototype.registerAction = function (instanceId, meta, func) {
    console.log("registerAction", instanceId, meta);

    var instance = this.moduleInstance(instanceId);

    if (!!instance) {
        instance.actions[meta.id] = meta;
        instance.actionFuncs[meta.id] = func;
        this.emit('core.instanceActionRegistered', instanceId, meta.id);
    } else {
        this.emit('error', new Error("Can't find module instance "+instanceId));
    }
};

AutomationController.prototype.removeInstancee = function (id) {
    delete this.instances[id];
    this.emit('core.instanceRemoved', id);
};

AutomationController.prototype.listDevices = function () {
    // TODO: Construct proper list for exporting
    this.emit('core.devicesList', this.devices);
};

AutomationController.prototype.registerDevice = function (deviceId, instance) {
    this.devices[deviceId] = instance;
    this.emit('core.deviceRegistered', deviceId);
};

AutomationController.prototype.removeDevice = function (id) {
    delete this.devices[id];
    this.emit('core.deviceRemoved', id);
};

AutomationController.prototype.listWidgets = function () {
    // TODO: Construct proper list for exporting
    this.emit('core.widgetsList', this.widgets);
};

AutomationController.prototype.registerWidget = function (meta) {
    this.widgets[meta.id] = meta;
    this.emit('core.widgetAdded', meta.id);
};

AutomationController.prototype.removeWidget = function (id) {
    delete this.widgets[id];
    this.emit('core.widgetRemoved', id);
};
