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

    this.on('core.registerInstance', this.onRegisterInstance);
    this.on('core.registerAction', this.onRegisterAction);
    this.on('core.removeInstance', this.onRemoveInstance);
    this.on('core.listInstances', this.onListInstances);

    this.on('core.registerDevice', this.onRegisterDevice);
    this.on('core.removeDevice', this.onRemoveDevice);
    this.on('core.listDevices', this.onListDevices);

    this.on('core.registerWidget', this.onRegisterWidget);
    this.on('core.removeWidget', this.onRemoveWidget);
    this.on('core.listWidgets', this.onListWidgets);

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
            console.log("--- Instantiating module", instanceId, "from class", instanceDefs.module);

            var moduleClass = self.modules[instanceDefs.module];
            var instance = new moduleClass(instanceId, self);
            instance.init(instanceDefs.config);

            self.emit('core.registerInstance', instance);
        });
    }
};

AutomationController.prototype.moduleInstance = function (instanceId) {
    console.log("--- INST", Object.keys(this.instances));
    return this.instances.hasOwnProperty(instanceId) ? this.instances[instanceId] : null;
};

AutomationController.prototype.listInstances = function () {
    var res = {};

    Object.keys(this.instances).forEach(function (instanceId) {
        res[instanceId] = this.instances[instanceId].meta;
    });

    return res;
};

AutomationController.prototype.onListInstances = function () {
    this.emit('core.instancesList', this.listInstances());
};

AutomationController.prototype.onRegisterInstance = function (instance) {
    var instanceId = instance.id;

    console.log("--- Trying to register module instance", instanceId);

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
AutomationController.prototype.onRegisterAction = function (instanceId, actionMeta, actionFunc) {
    console.log("registerAction", instanceId, actionMeta);

    var instance = this.moduleInstance(instanceId);

    if (!!instance) {
        instance.actions[actionMeta.id] = actionMeta;
        instance.actionFuncs[actionMeta.id] = func;
        this.emit('core.actionRegistered', instanceId, actionMeta.id);
    } else {
        this.emit('error', new Error("Can't find module instance "+instanceId));
    }
};

AutomationController.prototype.onRemoveInstance = function (id) {
    delete this.instances[id];
    this.emit('core.instanceRemoved', id);
};

AutomationController.prototype.onRegisterDevice = function (device) {
    this.devices[device.id] = device;

    this.emit('core.deviceRegistered', device.id);
};

AutomationController.prototype.onRemoveDevice = function (id) {
    delete this.devices[id];

    this.emit('core.deviceRemoved', id);
};

AutomationController.prototype.listDevices = function () {
    var res = {};

    Object.keys(this.devices).forEach(function (deviceId) {
        res[deviceId] = {
            deviceType: this.devices[deviceId].deviceType
        }
    });

    return res;
};

AutomationController.prototype.onListDevices = function () {
    this.emit('core.devicesList', this.listDevices());
};

AutomationController.prototype.onRegisterWidget = function (widget) {
    this.widgets[widget.id] = widget;

    this.emit('core.widgetRegistered', widget.id);
};

AutomationController.prototype.onRemoveWidget = function (id) {
    delete this.widget[id];

    this.emit('core.widgetRemoved', id);
};

AutomationController.prototype.listWidgets = function () {
    var res = {};

    Object.keys(this.widgets).forEach(function (widgetId) {
        res[widgetId] = {
            widgetType: "unknown"
        }
    });

    return res;
}

AutomationController.prototype.onListWidgets = function () {
    this.emit('core.widgetsList', this.listWidgets());
};
