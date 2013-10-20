/*** Z-Way HA Controller class module *****************************************

Version: 1.0.0
-------------------------------------------------------------------------------
Author: Gregory Sitnin <sitnin@z-wave.me>
Copyright: (c) ZWave.Me, 2013

******************************************************************************/

function AutomationController (config, vdevInfo) {
    AutomationController.super_.call(this);

    this.config = config;

    this.modules = {};
    this.instances = {};
    this.devices = {};
    this.widgets = {};
    this.widgetClasses = {};
    this._autoLoadModules = [];
    this._loadedSingletons = [];
    this.vdevInfo = vdevInfo;
}

inherits(AutomationController, EventEmitter2);

function wrap (self, func) {
    return function () {
        func.apply(self, arguments);
    };
}

AutomationController.prototype.init = function () {
    var self = this;

    this.on('core.listInstances', wrap(this, this.listInstances));
    this.on('core.listDevices', wrap(this, this.listDevices));
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
    console.log("--- Loading ZAutomation classes");
    var self = this;

    fs.list("modules/").forEach(function (moduleClassName) {
        var moduleMetaFilename = "modules/" + moduleClassName + "/module.json";
        var _st = fs.stat(moduleMetaFilename);
        if ("file" !== _st.type || 2 > _st.size) {
            console.log("ERROR: Cannot read module metadata from", moduleMetaFilename);
            return;
        }

        var moduleMeta = loadJSON(moduleMetaFilename);
        if (moduleMeta.hasOwnProperty("skip"), !!moduleMeta["skip"]) return;

        if (moduleMeta.hasOwnProperty("autoload") && !!moduleMeta["autoload"]) {
            var _priority = moduleMeta.hasOwnProperty("autoloadPriority") ? moduleMeta["autoloadPriority"] : 1000;
            self._autoLoadModules.push([_priority, moduleClassName]);
        }

        var moduleFilename = "modules/" + moduleClassName + "/index.js";
        _st = fs.stat(moduleFilename);
        if ("file" !== _st.type || 2 > _st.size) {
            console.log("ERROR: Cannot stat module", moduleFilename);
            return;
        }

        console.log("Loading module " + moduleClassName + " from " + moduleFilename);
        executeFile(moduleFilename);

        // Monkey-patch module with basePath method
        _module.prototype.moduleBasePath = function () {
            return "modules/" + moduleClassName;
        };

        // Grab _module and clear it out
        self.modules[moduleClassName] = _module;
        _module = undefined;
    });

    // Sort and clarify automatically loaded modules list
    this._autoLoadModules = this._autoLoadModules.sort(function (a, b) {
        if (a[0] < b[0]) {
            return -1;
        } else if (a[0] > b[0]) {
            return 1;
        }

        return 0;
    }).map(function (item) {
        return item[1];
    });

    if (callback) callback();
};

AutomationController.prototype.instantiateModule = function (instanceId, instanceClass, config) {
    console.log("Instantiating module", instanceId, "from class", instanceClass);

    var self = this;
    var moduleClass = self.modules[instanceClass];

    var instance = new moduleClass(instanceId, self);
    instance.getMeta();

    if (instance.meta["singleton"]) {
        if (in_array(this._loadedSingletons, instanceClass)) {
            console.log("WARNING: Module", instanceId, "is a singleton and already has been instantiated. Skipping.");
            return;
        }

        this._loadedSingletons.push(instanceClass);
    }

    instance.init(config || {});
    self.registerInstance(instance);
};

AutomationController.prototype.instantiateModules = function () {
    var self = this;

    console.log("--- Automatic modules instantiation");
    this._autoLoadModules.forEach(function (moduleClassName) {
        self.instantiateModule(moduleClassName, moduleClassName);
    });

    console.log("--- User configured modules instantiation");
    if (this.config.hasOwnProperty('instances')) {
        Object.keys(this.config.instances).forEach(function (instanceId) {
            var instanceDefs = self.config.instances[instanceId];
            self.instantiateModule(instanceId, instanceDefs.module, instanceDefs.config);
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

AutomationController.prototype.deviceExists = function (vDevId) {
    return Object.keys(this.devices).indexOf(vDevId) >= 0;
}

AutomationController.prototype.registerWidget = function (widget) {
    this.widgets[widget.id] = widget;
    this.emit('core.widgetRegistered', widget.id);
};

AutomationController.prototype.registerWidgetClass = function (meta) {
    this.widgetClasses[meta.className] = meta;
    this.emit('core.widgetClassRegistered', meta.className);
};

AutomationController.prototype.removeWidgetClass = function (id) {
    delete this.widgetClasses[id];

    this.emit('core.widgetRemoved', id);
};

AutomationController.prototype.listWidgetClasses = function () {
    this.emit('core.widgetsList', this.widgetClasses);
    return res;
}

AutomationController.prototype.getVdevInfo = function (id) {
    return this.vdevInfo[id];
}
