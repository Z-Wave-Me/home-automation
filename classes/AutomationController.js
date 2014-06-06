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
    this.profiles = config.profiles || [];
    this.vdevInfo = config.vdevInfo || {};
    this.instances = config.instances || [];
    this.namespaces = namespaces || [];
    this.registerInstances = [];
    this.files = files || {};

    this.modules = {};
    this.devices = new DevicesCollection(this);
    this.schemas = config.schemas || [];

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
        "locations": this.locations,
        "profiles": this.profiles,
        "instances": this.instances
    };

    saveObject("config.json", cfgObject);
    saveObject("schemas.json", this.schemas);
};

AutomationController.prototype.saveFiles = function () {
    saveObject("files.json", this.files);
};

AutomationController.prototype.start = function () {
    // Restore persistent data
    this.loadNotifications();

    // Run all modules
    console.log("Loading modules...");
    this.instantiateModules();

    // Run webserver
    console.log("Starting webserver...");
    api = new ZAutomationAPIWebRequest(this).handlerFunc();

    // Run storage
    console.log("Starting storage...");
    storage = new ZAutomationStorageWebRequest().handlerFunc();

    // Notify core
    this.emit("core.start");
};

AutomationController.prototype.stop = function () {
    // Remove API webserver
    console.log("Stopping webserver...");
    api = null;
    storage = null;

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
    this.addNotification("warning", "Automation Controller is restarted", "core");
};

AutomationController.prototype.loadModules = function (callback) {
    console.log("--- Loading ZAutomation classes");
    var self = this;

    fs.list("modules/").forEach(function (moduleClassName) {
        self.loadModulesFromFolder(moduleClassName, "modules/");
    });

    (fs.list("user_modules/") || []).forEach(function (moduleClassName) {
        self.loadModulesFromFolder(moduleClassName, "user_modules/");
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

AutomationController.prototype.loadModulesFromFolder = function (moduleClassName, folder) {
    var self = this;

    var moduleMetaFilename = folder + moduleClassName + "/module.json",
        _st = fs.stat(moduleMetaFilename);

    if (!_st || "file" !== _st.type || 2 > _st.size) {
        console.log("ERROR: Cannot read module metadata from", moduleMetaFilename);
        return;
    }

    try {
        var moduleMeta = loadJSON(moduleMetaFilename);
    } catch (e) {
        self.addNotification("error", "Can not load modules.json from " + moduleMetaFilename + ": " + e.toString(), "core");
        console.log(e.stack);
        return; // skip this modules
    }
    if (moduleMeta.hasOwnProperty("skip"), !!moduleMeta["skip"]) return;

    if (moduleMeta.hasOwnProperty("autoload") && !!moduleMeta["autoload"]) {
        var _priority = moduleMeta.hasOwnProperty("autoloadPriority") ? moduleMeta["autoloadPriority"] : 1000;
        self._autoLoadModules.push([_priority, moduleClassName]);
    }

    var moduleFilename = folder + moduleClassName + "/index.js";
    _st = fs.stat(moduleFilename);
    if ("file" !== _st.type || 2 > _st.size) {
        console.log("ERROR: Cannot stat module", moduleFilename);
        return;
    }

    console.log("Loading module " + moduleClassName + " from " + moduleFilename);
    try {
        executeFile(moduleFilename);
    } catch (e) {
        self.addNotification("error", "Can not load index.js from " + moduleFilename + ": " + e.toString(), "core");
        console.log(e.stack);
        return; // skip this modules
    }
    
    // Monkey-patch module with basePath method
    _module.prototype.moduleBasePath = function () {
        return folder + moduleClassName;
    };

    moduleMeta.id = moduleClassName;

    // Grab _module and clear it out
    self.modules[moduleClassName] = {
        meta: moduleMeta,
        classRef: _module
    };

    _module = undefined;
};

AutomationController.prototype.instantiateModule = function (instanceModel) {
    var self = this,
        module = _.find(self.modules, function (module) { return instanceModel.moduleId === module.meta.id; }),
        instance = null;

    if (!module) {
        self.addNotification("error", "Can not instanciate module: module not found in the list of all modules", "core");
    }
    
    if ((instanceModel.params.hasOwnProperty('status') && instanceModel.params.status === 'enable') || !instanceModel.params.hasOwnProperty('status')) {
        try {
            instance = new global[module.meta.id](instanceModel.id, self);
        } catch (e) {
            self.addNotification("error", "Can not instanciate module " + ((module && module.meta) ? module.meta.id : instanceModel.moduleId) + ": " + e.toString(), "core");
            console.log(e.stack);
            return null;
        }

        console.log("Instantiating module", instanceModel.id, "from class", module.meta.id);

        if (module.meta.singleton) {
            if (in_array(self._loadedSingletons, module.meta.id)) {
                console.log("WARNING: Module", instanceModel.id, "is a singleton and already has been instantiated. Skipping.");
                return;
            }

            self._loadedSingletons.push(module.meta.id);
        }

        try {
            instance.init(instanceModel.params);
        } catch (e) {
            self.addNotification("error", "Can not init module " + ((module && module.meta) ? module.meta.id : instanceModel.moduleId) + ": " + e.toString(), "core");
            console.log(e.stack);
            return null;
        }
        
        self.registerInstance(instance);
        return instance;
    }
};

AutomationController.prototype.instantiateModules = function () {
    var self = this,
        module;

    console.log("--- Automatic modules instantiation ---");
    self._autoLoadModules.forEach(function (moduleClassName) {
        module = _.find(self.modules, function (module) { return module.meta.id === moduleClassName; });
        if (!!module && !_.any(self.instances, function (model) { return model.moduleId === module.meta.id; })) {
            self.createInstance(module.meta.id, module.meta.defaults);
        }
    });

    console.log("--- User configured modules instantiation ---");
    if (self.instances.length > 0) {
        self.instances.forEach(function (instance) {
            self.instantiateModule(instance);
        });
    } else {
        console.log("--! No user-configured instances found");
    }
};

AutomationController.prototype.moduleInstance = function (instanceId) {
    return this.instances.hasOwnProperty(instanceId) ? this.instances[instanceId] : null;
};

AutomationController.prototype.registerInstance = function (instance) {
    var self = this;

    if (!!instance) {
        var instanceId = instance.id,
            isExistInstance = self.registerInstances.hasOwnProperty(instanceId);

        if (!isExistInstance) {
            self.registerInstances[instanceId] = instance;
            self.emit('core.instanceRegistered', instanceId);
        } else {
            self.emit('core.error', new Error("Can't register module instance " + instanceId + " twice"));
        }
    } else {
        self.emit('core.error', new Error("Can't register empty module instance " + instance.id));
    }
};

AutomationController.prototype.createInstance = function (moduleId, params) {
    //var instance = this.instantiateModule(id, className, config),
    var self = this,
        id = self.instances.length ? self.instances[self.instances.length - 1].id + 1 : 1,
        instance = null,
        module = _.find(self.modules, function (module) { return module.meta.id === moduleId; }),
        result;

    if (!!module) {
        instance = {
            id: id,
            moduleId: moduleId,
            params: params,
            userView: module.meta.userView
        };

        self.instances.push(instance);
        self.saveConfig();
        self.emit('core.instanceCreated', id);
        self.instantiateModule(instance);
        result = instance;
    } else {
        self.emit('core.error', new Error("Cannot create module " + moduleId + " instance with id " + id));
        result = false;
    }

    return result;
};

AutomationController.prototype.stopInstance = function (instance) {
    try {
        instance.stop();
    } catch (e) {
        this.addNotification("error", "Can not stop module " + ((instance && instance.id) ? instance.id : "<unknow id>") + ": " + e.toString(), "core");
        console.log(e.stack);
        return;
    }
    if (instance.meta.singleton) {
        var index = this._loadedSingletons.indexOf(instance.meta.id);
        if (index > -1) {
            this._loadedSingletons.splice(index, 1);
        }
    }
};

AutomationController.prototype.reconfigureInstance = function (id, config) {
    var instance = this.registerInstances[id],
        index = this.instances.indexOf(_.find(this.instances, function (model) { return model.id === id; })),
        result;

    if (instance !== undefined) { // is registered
        this.stopInstance(instance);

        if (config.params.status === 'enable') { // here we read new config instead of existing
            instance.init(config);
        }

        if (config.hasOwnProperty('params')) {
            this.instances[index].params = config;
        }

        this.emit('core.instanceReconfigured', id);
        result = this.instances[index];
    } else if (!instance && index !== -1) { // is not registered
        this.instances[index].params = config;
        if (config.status === 'enable') {
            this.instantiateModule(this.instances[index]);
        }
        result = this.instances[index];
        this.emit('core.instanceReconfigured', id);
    } else {
        this.emit('core.error', new Error("Cannot reconfigure instance with id " + id ));
    }

    this.saveConfig();
    return result;
};

AutomationController.prototype.removeInstance = function (id) {
    var instance = this.registerInstances[id],
        instanceClass = id;


    if (!!instance) {
        this.stopInstance(instance);

        if (instance.meta.singleton) {
            var pos = this._loadedSingletons.indexOf(instanceClass);
            if (pos >= 0) {
                this._loadedSingletons.splice(pos, 1);
            }
        }

        delete this.registerInstances[id];
        this.emit('core.instanceStopped', id);
        this.saveConfig();
    }
};

AutomationController.prototype.deleteInstance = function (id) {
    this.removeInstance(id);

    this.instances = this.instances.filter(function(model) { return id !== model.id; })
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
    
    if (!vdev)
        return;
    
    vdev.destroy();
    delete this.devices[id];

    this.lastStructureChangeTime = Math.floor(new Date().getTime() / 1000);

    this.emit('core.deviceRemoved', id);
};

AutomationController.prototype.deviceExists = function (vDevId) {
    return Object.keys(this.devices).indexOf(vDevId) >= 0;
}

AutomationController.prototype.getVdevInfo = function (id) {
    return this.vdevInfo[id] || {};
}

AutomationController.prototype.setVdevInfo = function (id, device) {
    this.vdevInfo[id] = _.pick(device, ["deviceType", "metrics", "location", "tags"]);
    this.saveConfig();
    return this.vdevInfo[id];
}

AutomationController.prototype.saveNotifications = function () {
    saveObject("notifications", this.notifications);
}

AutomationController.prototype.loadNotifications = function () {
    this.notifications = loadObject("notifications") || [];
}

AutomationController.prototype.addNotification = function (severity, message, type) {
    var now = new Date(), notice;

    notice = {
        id: Math.floor(new Date().getTime() / 1000),
        timestamp: now.toISOString(),
        level: severity,
        message: message,
        type: type || 'device',
        redeemed: false
    };

    this.notifications.push(notice);
    this.saveNotifications();
    this.emit("notifications.push", notice); // notify modules to allow SMS and E-Mail notifications
    console.log("Notification:", severity, "(" + type + "):", message);
}

AutomationController.prototype.deleteNotifications = function (ids, callback, removeNotification) {
    var that = this;
    ids = Array.isArray(ids) ? ids : [ids];


    if (removeNotification) {
        that.notifications = that.notifications.filter(function (notification) {
            return ids.indexOf(parseInt(notification.id)) === -1;
        });
    } else {
        that.notifications.forEach(function (notification) {
            if (ids.indexOf(parseInt(notification.id)) !== -1) {
                that.notifications[that.notifications.indexOf(notification)].redeemed = true;
            }
        });
    }

    callback(true);
    this.saveNotifications();
};

AutomationController.prototype.addLocation = function (title, icon, callback) {
    var id = this.locations.length ? this.locations[this.locations.length - 1].id + 1 : 1;
    var locations = this.locations.filter(function (location) {
        return location.id === id;
    });

    if (locations.length > 0) {
        callback(false)
    } else {
        var location = {
            id: id,
            title: title,
            icon: icon || ''
        };
        this.locations.push(location);
        callback(location);
        this.saveConfig();
        this.emit('location.added', id);
    }
};

AutomationController.prototype.removeLocation = function (id, callback) {
    var self = this;
    var locations = this.locations.filter(function (location) {
        return location.id === id;
    });
    if (locations.length > 0) {
        Object.keys(this.devices).forEach(function (vdevId) {
            var vdev = self.devices[vdevId];
            if (vdev.location === id) {
                vdev.location = null;
            }
        });

        this.locations = this.locations.filter(function (location) {
            return location.id !== id;
        });

        this.saveConfig();
        callback(true);
        this.emit('location.removed', id);
    } else {
        callback(false);
        this.emit('core.error', new Error("Cannot remove location "+id+" - doesn't exist"));
    }
};

AutomationController.prototype.updateLocation = function (id, title, callback) {
    var locations = this.locations.filter(function (location) {
        return location.id === id;
    });
    if (locations.length > 0) {
        this.locations[this.locations.indexOf(locations[0])].title = title;
        callback(this.locations[this.locations.indexOf(locations[0])]);
        this.saveConfig();
        this.emit('location.updated', id);
    } else {
        callback(false);
        this.emit('core.error', new Error("Cannot update location "+id+" - doesn't exist"));
    }
};

AutomationController.prototype.listNotifications = function (since, isRedeemed) {
    var self = this;
    since = parseInt(since) || 0;
    var filteredNotifications = this.notifications.filter(function (notification) {
        return notification.id >= since && notification.redeemed === isRedeemed;
    });

    return filteredNotifications;
};

AutomationController.prototype.getNotification = function (id) {
    var filteredNotifications = this.notifications.filter(function (notification) {
        return parseInt(notification.id) === parseInt(id);
    });

    return filteredNotifications[0] || null;
};

AutomationController.prototype.updateNotification = function (id, object, callback) {
    var filteredNotifications = _.find(this.notifications, function (notification) {
            return parseInt(notification.id) === parseInt(id);
        }),
        index = this.notifications.indexOf(filteredNotifications);

    if (object.hasOwnProperty('redeemed')) {
        this.notifications[index].redeemed = object.redeemed;
        this.saveNotifications();
        callback(this.notifications[index]);
    } else {
        callback(null);
    }
};

AutomationController.prototype.getListProfiles = function () {
    if (this.profiles.length === 0) {
        this.profiles.push({
            id: 1,
            name: 'Default',
            description: 'This is default profile. Default profile created automatically.',
            positions: [],
            active: true
        })
    }
    return this.profiles;
};

AutomationController.prototype.getProfile = function (id) {
    var profile = this.profiles.filter(function (profile) {
        return profile.id === parseInt(id);
    });

    return profile[0] || null;
};

AutomationController.prototype.createProfile = function (object) {
    var id = this.profiles.length ? this.profiles[this.profiles.length - 1].id + 1 : 1,
        profile;

    this.profiles.push({
        id: id,
        name: object.name,
        description: object.description || null,
        positions: object.positions || [],
        active: object.active || false
    });

    this.saveConfig();
    return profile;
};

AutomationController.prototype.updateProfile = function (object, id) {
    var profile = _.find(this.profiles, function (profile) {
            return profile.id === parseInt(id);
        }),
        index;

    if (!!profile) {
        index = this.profiles.indexOf(profile);

        if (object.hasOwnProperty('name')) {
            this.profiles[index].name = object.name;
        }
        if (object.hasOwnProperty('description')) {
            this.profiles[index].description = object.description;
        }
        if (object.hasOwnProperty('positions')) {
            this.profiles[index].positions = object.positions;
        }
        if (object.hasOwnProperty('active')) {
            this.profiles[index].active = object.active;
        }
    }

    this.saveConfig();
    return this.profiles[index];
};

AutomationController.prototype.removeProfile = function (id) {
    this.profiles = this.profiles.filter(function (profile) {
        return profile.id !== parseInt(id);
    });

    this.saveConfig();
};

// namespaces
AutomationController.prototype.generateNamespaces = function (callback) {
    var that = this,
        devices = that.devices.models,
        deviceTypes = _.uniq(_.map(devices, function (device) { return device.toJSON().deviceType; }));

    that.namespaces = [];
    deviceTypes.forEach(function (type) {
        that.setNamespace('devices_' + type, that.devices.filter(function (device) {
            return device.get('deviceType') === type;
        }).map(function (device) {
            return {deviceId: device.id, deviceName: device.get('metrics:title')};
        }));
    });
    that.setNamespace('devices_all', that.devices.map(function (device) {
        return {deviceId: device.id, deviceName: device.get('metrics:title')};
    }));
    callback(that.namespaces);
};

AutomationController.prototype.getListNamespaces = function (id) {
    var result = null,
        namespaces = this.namespaces;

    id = id || null;

    if (!!id) {
        result = namespaces.filter(function (namespace) {
            return namespace.id === parseInt(id);
        })[0];
    } else {
        result = namespaces;
    }

    return result;
};

AutomationController.prototype.setNamespace = function (id, reqObj) {
    var result = null,
        namespace,
        index;

    id = id || null;

    if (id && this.getListNamespaces(id)) {
        namespace = _.find(this.namespaces, function (namespace) {
            return namespace.id === id;
        });
        if (!!namespace) {
            index = this.namespaces.indexOf(namespace);
            this.namespaces[index].params = reqObj.data;
            result = this.namespaces[index];
        }
    } else {
        this.namespaces.push({
            id: id,
            params: reqObj
        })
        result = null;
    }

    return result;
};

AutomationController.prototype.createNamespace = function (reqObj) {

    if (reqObj.hasOwnProperty('id') && reqObj.hasOwnProperty('params')) {
        var namespace = reqObj;

        this.namespaces.push(namespace);
        return namespace;
    }

};


AutomationController.prototype.deleteNamespace = function (id) {
    var result = null,
        namespace,
        index;

    id = id || null;

    if (id && this.getListNamespaces(id)) {
        this.namespaces = this.namespaces.filter(function (namespace) {
            return namespace.id !== parseInt(id);
        });
    }
};


AutomationController.prototype.pullFile = function (id) {
    var file;
    if (this.files.hasOwnProperty('id')) {
        file = this.files[id];
        file["blob"] = loadObject(id);
    } else {
        file = null;
    }
    return file;
};

AutomationController.prototype.pushFile = function (file, callback) {
    var id = String((new Date()).getTime());
    this.files[id] = {
        name: file.name,
        type: file.type,
        id: id
    }
    this.saveFiles();
    saveObject(id, file);
    callback(this.files[id]);
};
