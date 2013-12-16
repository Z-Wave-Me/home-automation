/*** Z-Way HA Controller class module *****************************************

Version: 1.0.0
-------------------------------------------------------------------------------
Author: Gregory Sitnin <sitnin@z-wave.me>
Copyright: (c) ZWave.Me, 2013

******************************************************************************/

function AutomationController () {
    AutomationController.super_.call(this);

    this.config = config.controller || {};
    this.locations = config.locations || [];
    this.vdevInfo = config.vdevInfo || {};

    console.log(JSON.stringify(config, null, "  "));

    this.modules = {};
    this.instances = {};
    this.devices = {};

    this.notifications = [];
    this.lastStructureChangeTime = 0;

    this._autoLoadModules = [];
    this._loadedSingletons = [];
}

inherits(AutomationController, EventEmitter2);

function wrap (self, func) {
    return function () {
        func.apply(self, arguments);
    };
}

AutomationController.prototype.init = function () {
    var self = this;

    this.loadModules(function () {
        self.emit("core.init");
    });
};

AutomationController.prototype.saveConfig = function () {
    var cfgObject = {
        "controller": this.config,
        "vdevInfo": this.vdevInfo,
        "locations": this.locations
    }

    saveObject("config.json", cfgObject);
};

AutomationController.prototype.start = function () {
    // Restore persistent data
    this.loadNotifications();

    // Run all modules
    console.log("Loading modules...");
    this.instantiateModules();

    // Run webserver
    console.log("Starting webserver...");
    api = new ZAutomationAPIWebRequest().handlerFunc();

    // Notify core
    this.emit("core.start");
};

AutomationController.prototype.stop = function () {
    // Remove API webserver
    console.log("Stopping webserver...");
    api = null;

    var self = this;

    // Clean devices
    console.log("Stopping devices...");
    Object.keys(this.devices).forEach(function (id) {
        var vdev = self.devices[id];
        vdev.destroy();
        delete self.devices[id];
    });

    // Clean modules
    console.log("Stopping modules...");
    Object.keys(this.instances).forEach(function (instanceId) {
        self.removeInstance(instanceId);
    });
    this._loadedSingletons = [];

    // Notify core
    this.emit("core.stop");
};

AutomationController.prototype.restart = function () {
    this.stop();
    this.start();
    this.addNotification("warning", "Automation Controller is restarted");
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
        self.modules[moduleClassName] = {
            meta: moduleMeta,
            classRef: _module
        };
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

AutomationController.prototype.instantiateModule = function (instanceId, instanceClass, instanceConfig) {
    console.log("Instantiating module", instanceId, "from class", instanceClass);

    var self = this;
    var moduleClass = self.modules[instanceClass].classRef;

    var instance = new moduleClass(instanceId, self);

    if (instance.meta["singleton"]) {
        if (in_array(this._loadedSingletons, instanceClass)) {
            console.log("WARNING: Module", instanceId, "is a singleton and already has been instantiated. Skipping.");
            return;
        }

        this._loadedSingletons.push(instanceClass);
    }

    instance.init(instanceConfig);

    self.registerInstance(instance);

    return instance;
};

AutomationController.prototype.instantiateModules = function () {
    var self = this;

    console.log("--- Automatic modules instantiation");
    this._autoLoadModules.forEach(function (moduleClassName) {
        self.instantiateModule(moduleClassName, moduleClassName);
    });

    console.log("--- User configured modules instantiation");
    if (this.config.hasOwnProperty('instances') && Object.keys(this.config.instances).length > 0) {
        Object.keys(this.config.instances).forEach(function (instanceId) {
            var instanceDefs = self.config.instances[instanceId];
            self.instantiateModule(instanceId, instanceDefs.module, instanceDefs.config);
        });
    } else {
        console.log("--! No user-configured instances found");
    }
};

AutomationController.prototype.moduleInstance = function (instanceId) {
    return this.instances.hasOwnProperty(instanceId) ? this.instances[instanceId] : null;
};

AutomationController.prototype.registerInstance = function (instance) {
    if (!!instance) {
        var instanceId = instance.id;

        if (!this.instances.hasOwnProperty(instanceId)) {
            this.instances[instanceId] = instance;
            this.emit('core.instanceRegistered', instanceId);
        } else {
            this.emit('core.error', new Error("Can't register module instance "+instanceId+" twice"));
        }
    } else {
        this.emit('core.error', new Error("Can't register empty module instance "+instanceId));
    }
};

AutomationController.prototype.createInstance = function (id, className, config) {
    var instance = this.instantiateModule(id, className, config);
    if (!!instance) {
        if (!this.config.hasOwnProperty("instances")) {
            this.config.instances = {};
        }
        this.config.instances[id] = {
            module: className,
            config: config
        };
        this.saveConfig();
        this.emit('core.instanceCreated', id);
        return true;
    } else {
        this.emit('core.error', new Error("Cannot create module "+className+" instance with id "+id));
        return false;
    }
};

AutomationController.prototype.reconfigureInstance = function (id, config) {
    var instance = this.instances[id];

    if (!!instance) {
        instance.stop();
        instance.init(config);

        this.emit('core.instanceReconfigured', id);
        return true;
    } else {
        this.emit('core.error', new Error("Cannot reconfigure module "+className+" instance with id "+id));
        return false;
    }
};

AutomationController.prototype.removeInstance = function (id) {
    var instance = this.instances[id];
    var instanceClass = instance.toJSON()["module"];

    instance.saveConfig();
    instance.stop();

    if (instance.meta["singleton"]) {
        var pos = this._loadedSingletons.indexOf(instanceClass);
        if (pos >= 0) {
            this._loadedSingletons.splice(pos, 1);
        }
    }

    delete this.instances[id];

    this.emit('core.instanceStopped', id);
};

AutomationController.prototype.deleteInstance = function (id) {
    this.removeInstance(id);

    delete this.config.instances[id];
    this.saveConfig();

    this.emit('core.instanceDeleted', id);
};

AutomationController.prototype.registerDevice = function (device) {
    this.devices[device.id] = device;
    this.lastStructureChangeTime = Math.floor(new Date().getTime() / 1000);

    this.emit('core.deviceRegistered', device.id);
};

AutomationController.prototype.removeDevice = function (id) {
    var vdev = this.devices[id];

    vdev.destroy();
    delete this.devices[id];

    this.lastStructureChangeTime = Math.floor(new Date().getTime() / 1000);

    this.emit('core.deviceRemoved', id);
};

AutomationController.prototype.deviceExists = function (vDevId) {
    return Object.keys(this.devices).indexOf(vDevId) >= 0;
}

AutomationController.prototype.getVdevInfo = function (id) {
    return this.vdevInfo[id];
}

AutomationController.prototype.saveNotifications = function () {
    saveObject("notifications", this.notifications);
}

AutomationController.prototype.loadNotifications = function () {
    this.notifications = loadObject("notifications") || {};
}

AutomationController.prototype.addNotification = function (severity, message) {
    var now = new Date(), notice;

    notice = {
        id: now.getTime().toString(),
        timestamp: now.toISOString(),
        level: severity,
        message: message,
        mark: false
    };

    this.notifications.push(notice);

    this.saveNotifications();
}

AutomationController.prototype.deleteNotifications = function (ids) {
    this.notifications.filter(function (notification) {
        return ids.indexOf(notification.id) === -1;
    });
    this.saveNotifications();
};

AutomationController.prototype.addLocation = function (title) {
    var id = this.locations.length ? this.locations[this.locations.length - 1].id + 1 : 1;
    this.locations.push({
        id: id,
        title: title
    });
    this.saveConfig();
    this.emit('location.added', id);
};

AutomationController.prototype.removeLocation = function (id, callback) {
    var self = this;
    var location = this.locations.filter(function (location) {
        return location.id === id;
    });
    if (!!location.length) {
        Object.keys(this.devices).forEach(function (vdevId) {
            var vdev = self.devices[vdevId];
            if (vdev.location === location.id) {
                vdev.location = null;
            }
        });
        this.locations.filter(function (location) {
            return location.id === id;
        });
        this.saveConfig();
        callback(true);
        this.emit('location.removed', id);
    } else {
        callback(false);
        this.emit('core.error', new Error("Cannot remove location "+id+" - doesn't exist"));
    }
};

AutomationController.prototype.updateLocation = function (id, title) {
    var location = this.locations.filter(function (location) {
        return location.id === id;
    });
    if (location) {
        location.title = title;
        this.saveConfig();
        this.emit('location.updated', id);
    } else {
        this.emit('core.error', new Error("Cannot update location "+id+" - doesn't exist"));
    }
};

AutomationController.prototype.listNotifications = function (since) {
    var self = this;
    since = since || 0;
    var filteredNotifications = this.notifications.filter(function (notification) {
        return notification.id >= since;
    });

    return filteredNotifications;
};
