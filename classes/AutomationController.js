function AutomationController (config) {
    AutomationController.super_.call(this);

    this.config = config;

    this.modules = {};
    this.instances = {};
    this.devices = {};
    this.widgets = {};
}

inherits(AutomationController, EventEmitter2);

function wrap (self, func) {
    return function () {
        func.apply(self, arguments);
    };
}

AutomationController.prototype.init = function () {
    var self = this;

    // this.on('core.registerInstance', wrap(this, this.registerInstance));
    // this.on('core.registerAction', wrap(this, this.registerAction));
    // this.on('core.removeInstance', wrap(this, this.removeInstance));
    this.on('core.listInstances', wrap(this, this.listInstances));

    // this.on('core.registerDevice', wrap(this, this.registerDevice));
    // this.on('core.removeDevice', wrap(this, this.removeDevice));
    this.on('core.listDevices', wrap(this, this.listDevices));

    // this.on('core.registerWidget', wrap(this, this.registerWidget));
    // this.on('core.removeWidget', wrap(this, this.removeWidget));
    this.on('core.listWidgets', wrap(this, this.ristWidgets));

    this.loadModules(function () {
        self.instantiateModules();
        self.emit("init");
    });
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

            self.registerInstance(instance);
        });
    }
};

AutomationController.prototype.moduleInstance = function (instanceId) {
    return this.instances.hasOwnProperty(instanceId) ? this.instances[instanceId] : null;
};

AutomationController.prototype.listInstances = function () {
    var res = {};

    Object.keys(this.instances).forEach(function (instanceId) {
        res[instanceId] = this.instances[instanceId].meta;
    });

    this.emit('core.instancesList', res);

    return res;
};

AutomationController.prototype.registerInstance = function (instance) {
    var instanceId = instance.id;
    console.log("--Z Trying to register module instance", instanceId);

    if (!this.instances.hasOwnProperty(instanceId)) {
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
AutomationController.prototype.registerAction = function (instanceId, actionMeta, actionFunc) {
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

AutomationController.prototype.removeInstance = function (id) {
    delete this.instances[id];
    this.emit('core.instanceRemoved', id);
};

AutomationController.prototype.registerDevice = function (device) {
    this.devices[device.id] = device;

    this.emit('core.deviceRegistered', device.id);
};

AutomationController.prototype.removeDevice = function (id) {
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

    this.emit('core.devicesList', res);

    return res;
};

AutomationController.prototype.registerWidget = function (widget) {
    this.widgets[widget.id] = widget;

    this.emit('core.widgetRegistered', widget.id);
};

AutomationController.prototype.removeWidget = function (id) {
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

    this.emit('core.widgetsList', res);

    return res;
}
