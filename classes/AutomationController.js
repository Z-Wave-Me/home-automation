/*** Z-Way HA Controller class module *****************************************

 Version: 1.0.0
 -------------------------------------------------------------------------------
 Author: Gregory Sitnin <sitnin@z-wave.me>
 Copyright: (c) ZWave.Me, 2013

 ******************************************************************************/

function AutomationController() {
    AutomationController.super_.call(this);
    this.allow_headers = [
        'Accept-Ranges',
        'Content-Encoding',
        'Content-Length',
        'Content-Range',
        'Content-Type',
        'ETag',
        'API-Version',
        'Date',
        'Cache-Control',
        'If-None-Match',
        'Content-Language',
        'Accept-Language'
    ];
    this.config = config.controller || {};
    this.availableLang = ['en', 'ru', 'de'];
    this.defaultLang = 'en';
    this.locations = config.locations || [];
    this.profiles = config.profiles || [];
    this.vdevInfo = config.vdevInfo || {};
    this.instances = config.instances || [];
    this.modules_categories = config.modules_categories || [];
    this.namespaces = namespaces || [];
    this.registerInstances = {};
    this.files = files || {};

    this.modules = {};
    this.devices = new DevicesCollection(this);
    this.schemas = config.schemas || [];

    this.notifications = [];
    this.lastStructureChangeTime = 0;

    this._loadedSingletons = [];
}

inherits(AutomationController, EventEmitter2);

function wrap(self, func) {
    return function () {
        func.apply(self, arguments);
    };
}

AutomationController.prototype.init = function () {
    var self = this;


    function pushNamespaces() {
        self.generateNamespaces(function (namespaces) {
            ws.push({
                type: 'me.z-wave.namespaces.update',
                data: JSON.stringify(namespaces)
            });
        });
    }

    self.loadModules(function () {
        self.emit("core.init");

        self.devices.on('change', function (device) {
            ws.push({
                type: "me.z-wave.devices.update",
                data: JSON.stringify(device.toJSON())
            });
            pushNamespaces();
        });

        self.devices.on('created', function (device) {
            ws.push({
                type: "me.z-wave.devices.add",
                data: JSON.stringify(device.toJSON())
            });
            pushNamespaces();
        });

        self.devices.on('destroy', function (device) {
            ws.push({
                type: "me.z-wave.devices.destroy",
                data: JSON.stringify(device.toJSON())
            });
            pushNamespaces();
        });

        self.on("notifications.push", function (notice) {
            ws.push({
                type: "me.z-wave.notifications.add",
                data: JSON.stringify(notice)
            });
        });
    });
};

AutomationController.prototype.setDefaultLang = function (lang) {
    var self = this;

    self.defaultLang = self.availableLang.indexOf(lang) === -1 ? 'en' : lang;
};

AutomationController.prototype.saveConfig = function () {
    var cfgObject = {
        "controller": this.config,
        "vdevInfo": this.vdevInfo,
        "locations": this.locations,
        "profiles": this.profiles,
        "instances": this.instances,
        "modules_categories": this.modules_categories
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

    ZAutomation = function () {
        return {status: 400, body: "Invalid ZAutomation request"};
    };
    ws.allowExternalAccess("ZAutomation");

    // Run webserver
    console.log("Starting automation...");
    ZAutomation.api = new ZAutomationAPIWebRequest(this).handlerFunc();
    ws.allowExternalAccess("ZAutomation.api");

    // Run storage
    console.log("Starting storage...");
    ZAutomation.storage = new ZAutomationStorageWebRequest(this).handlerFunc();
    ws.allowExternalAccess("ZAutomation.storage");

    // Notify core
    this.emit("core.start");
};

AutomationController.prototype.stop = function () {
    // Remove API webserver
    console.log("Stopping automation...");
    ZAutomation = null;

    ws.revokeExternalAccess("ZAutomation");
    ws.revokeExternalAccess("ZAutomation.api");
    ws.revokeExternalAccess("ZAutomation.storage");

    var self = this;

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
    this.addNotification("warning", "Automation Controller is restarted ", "", "core", "AutomationController", "nt_ac_restart");
};

AutomationController.prototype.loadModules = function (callback) {
    console.log("--- Loading ZAutomation classes");
    var self = this;

    fs.list("modules/").forEach(function (moduleClassName) {
        self.loadModuleFromFolder(moduleClassName, "modules/");
    });

    (fs.list("userModules/") || []).forEach(function (moduleClassName) {
        self.loadModuleFromFolder(moduleClassName, "userModules/");
    });

    if (typeof callback === 'function') {
        callback();
    }
};

AutomationController.prototype.loadModuleFromFolder = function (moduleClassName, folder) {
    var self = this;

    var moduleMetaFilename = folder + moduleClassName + "/module.json",
        _st;

    _st = fs.stat(folder + moduleClassName);
    if (_st && "file" === _st.type) {
        return; // skip files in modules folders
    }

    _st = fs.stat(moduleMetaFilename);

    if (!_st || "file" !== _st.type || 2 > _st.size) {
        console.log("ERROR: Cannot read module metadata from", moduleMetaFilename);
        return;
    }

    try {
        var moduleMeta = fs.loadJSON(moduleMetaFilename);
    } catch (e) {
        self.addNotification("error", "Can not load modules.json from ", moduleMetaFilename + ": " + e.toString(), "core", "AutomationController", "nt_ac_errLoad_modjson");
        console.log(e.stack);
        return; // skip this modules
    }
    if (moduleMeta.hasOwnProperty("skip"), !!moduleMeta["skip"]) return;

    var moduleFilename = folder + moduleClassName + "/index.js";
    _st = fs.stat(moduleFilename);
    if ("file" !== _st.type || 2 > _st.size) {
        console.log("ERROR: Cannot stat module", moduleFilename);
        return;
    }

    moduleMeta.id = moduleClassName;

    // Grab _module and clear it out
    self.modules[moduleClassName] = {
        meta: moduleMeta,
        location: folder + moduleClassName
    };
};


AutomationController.prototype.instantiateModule = function (instanceModel) {
    var self = this,
        module = _.find(self.modules, function (module) {
            return instanceModel.moduleId === module.meta.id;
        }),
        instance = null;

    if (!module) {
        self.addNotification("error", "Can not instantiate module: module not found in the list of all modules ", "", "core", "AutomationController", "nt_ac_errInit_modules_not_found");
    }

    if (Boolean(instanceModel.active)) {
        try {
            instance = new global[module.meta.id](instanceModel.id, self);
        } catch (e) {
            self.addNotification("error", "Can not instantiate module ", ((module && module.meta) ? module.meta.id : instanceModel.moduleId) + ": " + e.toString(), "core", "AutomationController", "nt_ac_errInit_module");
            console.log(e.stack);
            return null; // not loaded
        }

        console.log("Instantiating module", instanceModel.id, "from class", module.meta.id);

        if (module.meta.singleton) {
            if (in_array(self._loadedSingletons, module.meta.id)) {
                console.log("WARNING: Module", instanceModel.id, "is a singleton and already has been instantiated. Skipping.");
                return null; // not loaded
            }

            self._loadedSingletons.push(module.meta.id);
        }

        try {
            instance.init(instanceModel.params);
        } catch (e) {
            self.addNotification("error", "Can not instantiate module ", ((module && module.meta) ? module.meta.id : instanceModel.moduleId) + ": " + e.toString(), "core", "AutomationController", "nt_ac_errInit_module");
            console.log(e.stack);
            return null; // not loaded
        }

        self.registerInstance(instance);
        return instance;
    }
};

AutomationController.prototype.loadModule = function (module, rootModule) {
    if (rootModule && rootModule === module) {
        console.log('Circular dependencies detected!');
        return false;
    }

    if (module.failed) return false; // already tried to load, and failed
    if (this.loadedModules.indexOf(module) >= 0) return true; // already loaded

    rootModule = rootModule || module;

    if (module.meta.dependencies instanceof Array) {
        for (var i in module.meta.dependencies) {
            var dep = module.meta.dependencies[i];

            var depModule = this.modules[dep];
            if (!depModule) {
                this.addNotification("error", "Dependency not found for module: [DEPENDENCY] :: [MODULE] = ", dep + " :: " + module.meta.id, "core", "AutomationController", "nt_ac_errDep_not_found");
                module.failed = true;
                return false;
            }

            if (!this.loadModule(depModule, rootModule)) {
                this.addNotification("error", "Failed to load module because dependency was not loaded: [MODULE] :: [DEPENDENCY] = ", module.meta.id + " :: " + dep, "core", "AutomationController", "nt_ac_errDep_not_loaded");
                module.failed = true;
                return false;
            }

            if (!this.loadedModules.some(function (x) {
                    return x.meta.id === dep
                })) {
                this.addNotification("error", "Failed to load module because dependency was not instanciated: [MODULE] :: [DEPENDENCY] = ", module.meta.id + " :: " + dep, "core", "AutomationController", "nt_ac_errDep_not_initiated");
                module.failed = true;
                return false;
            }
        }
    }

    console.log("Loading module " + module.meta.id + " from " + module.location);
    try {
        executeFile(module.location + "/index.js");
    } catch (e) {
        this.addNotification("error", "Can not load ", module.meta.id + ": " + e.toString(), "core", "AutomationController", "nt_errLoad");
        console.log(e.stack);
        module.failed = true;
        return false; // skip this modules
    }

    if (!_module) {
        this.addNotification("error", "Invalid module ", module.meta.id, "core", "AutomationController", "nt_ac_errInvalid_module");
        module.failed = true;
        return false; // skip this modules
    }

    // Monkey-patch module with basePath method
    _module.prototype.moduleBasePath = function () {
        return module.location;
    };

    module.classRef = _module;

    _module = undefined;

    // Loading instances

    var count = 0;
    this.instances.filter(function (x) {
        return x.moduleId === module.meta.id;
    }).forEach(function (x) {
        if (this.instantiateModule(x) !== null) {
            count++;
        }
    }, this);

    if (count)
        this.loadedModules.push(module);
    return true;
}

AutomationController.prototype.instantiateModules = function () {
    var self = this,
        module;

    this.loadedModules = [];

    Object.getOwnPropertyNames(this.modules).forEach(function (m) {
        this.loadModule(this.modules[m]);
    }, this);
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
            self.emit('core.error', new Error("Can't register duplicate module instance " + instanceId));
        }
    } else {
        self.emit('core.error', new Error("Can't register empty module instance " + instance.id));
    }
};

AutomationController.prototype.createInstance = function (reqObj) {
    //var instance = this.instantiateModule(id, className, config),
    var self = this,
        id = self.instances.length ? self.instances[self.instances.length - 1].id + 1 : 1,
        instance = null,
        module = _.find(self.modules, function (module) {
            return module.meta.id === reqObj.moduleId;
        }),
        result;

    if (!!module) {
        instance = _.extend(reqObj, {
            id: id
        });

        self.instances.push(instance);
        self.saveConfig();
        self.emit('core.instanceCreated', id);
        self.instantiateModule(instance);
        result = instance;
    } else {
        self.emit('core.error', new Error("Cannot create module " + reqObj.moduleId + " instance with id " + id));
        result = false;
    }

    return result;
};

AutomationController.prototype.stopInstance = function (instance) {
    try {
        instance.stop();
        delete this.registerInstances[instance.id];
    } catch (e) {
        this.addNotification("error", "Can not stop module ", ((instance && instance.id) ? instance.id : "<unknow id>") + ": " + e.toString(), "core", "AutomationController", "nt_ac_err_stop_module");
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

AutomationController.prototype.reconfigureInstance = function (id, instanceObject) {
    var register_instance = this.registerInstances[id],
        instance = _.find(this.instances, function (model) {
            return model.id === id;
        }),
        index = this.instances.indexOf(instance),
        config = instanceObject.params,
        result;


    if (instance) {
        if (register_instance) {
            this.stopInstance(register_instance);
        }

        _.extend(this.instances[index], {
            title: instanceObject.title,
            description: instanceObject.description,
            active: instanceObject.active,
            params: config
        });

        if (!!register_instance) {
            if (this.instances[index].active) { // here we read new config instead of existing
                register_instance.init(config);
                this.registerInstance(register_instance);
            } else {
                register_instance.saveNewConfig(config);
            }
        } else {
            if (this.instances[index].active) {
                this.instantiateModule(this.instances[index]);
            }
        }

        result = this.instances[index];
        this.emit('core.instanceReconfigured', id)
    } else {
        result = null;
        this.emit('core.error', new Error("Cannot reconfigure instance with id " + id));
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

    this.instances = this.instances.filter(function (model) {
        return id !== model.id;
    })
    this.saveConfig();
    this.emit('core.instanceDeleted', id);
};

AutomationController.prototype.deviceExists = function (vDevId) {
    return Object.keys(this.devices).indexOf(vDevId) >= 0;
}

AutomationController.prototype.getVdevInfo = function (id) {
    return this.vdevInfo[id] || {};
}

AutomationController.prototype.setVdevInfo = function (id, device) {
    this.vdevInfo[id] = _.pick(device, "deviceType", "metrics", "location", "tags", "permanently_hidden");
    this.saveConfig();
    return this.vdevInfo[id];
}

AutomationController.prototype.saveNotifications = function () {
    saveObject("notifications", this.notifications);
}

AutomationController.prototype.loadNotifications = function () {
    this.notifications = loadObject("notifications") || [];
}

AutomationController.prototype.addNotification = function (severity, consoleOutput, bgData, type, source, intlUIKey) {
    var now = new Date(), notice;

    notice = {
        id: Math.floor(now.getTime() / 1000),
        timestamp: now.toISOString(),
        level: severity,
        message: consoleOutput + bgData, 
        bgData: bgData,
        type: type || 'device',
        source: source,
        intlKey: intlUIKey,
        redeemed: false,
    };

    this.notifications.push(notice);
    this.saveNotifications();
    this.emit("notifications.push", notice); // notify modules to allow SMS and E-Mail notifications
    
    // consoleOutput -  not internationalized string that describes the notification in the console 
    //                  otherwise there is no output -> bad for debugging
    console.log("Notification:", severity, "(" + type + "):", consoleOutput + bgData);
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

    if (typeof callback === 'function') {
        callback(true);
    }

    this.saveNotifications();
};

AutomationController.prototype.addLocation = function (title, icon, callback) {
    var id = this.locations.length ? this.locations[this.locations.length - 1].id + 1 : 1;
    var locations = this.locations.filter(function (location) {
        return location.id === id;
    });

    if (locations.length > 0) {
        if (typeof callback === 'function') {
            callback(false)
        }
    } else {
        var location = {
            id: id,
            title: title,
            icon: icon || ''
        };
        this.locations.push(location);
        if (typeof callback === 'function') {
            callback(location);
        }
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
        if (typeof callback === 'function') {
            callback(true);
        }
        this.emit('location.removed', id);
    } else {
        if (typeof callback === 'function') {
            callback(false);
        }
        this.emit('core.error', new Error("Cannot remove location " + id + " - doesn't exist"));
    }
};

AutomationController.prototype.updateLocation = function (id, title, icon, callback) {
    var locations = this.locations.filter(function (location) {
        return location.id === id;
    });
    if (locations.length > 0) {
        this.locations[this.locations.indexOf(locations[0])].title = title;
        if (typeof icon === 'string' && icon.length > 0) {
            this.locations[this.locations.indexOf(locations[0])].icon = icon;
        }
        if (typeof callback === 'function') {
            callback(this.locations[this.locations.indexOf(locations[0])]);
        }
        this.saveConfig();
        this.emit('location.updated', id);
    } else {
        if (typeof callback === 'function') {
            callback(false);
        }
        this.emit('core.error', new Error("Cannot update location " + id + " - doesn't exist"));
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

AutomationController.prototype.getCountNotifications = function () {
    return this.notifications.length || 0;
};

AutomationController.prototype.updateNotification = function (id, object, callback) {
    var filteredNotifications = _.find(this.notifications, function (notification) {
            return parseInt(notification.id) === parseInt(id);
        }),
        index = this.notifications.indexOf(filteredNotifications);

    if (object.hasOwnProperty('redeemed')) {
        this.notifications[index].redeemed = object.redeemed;
        this.saveNotifications();
        if (typeof callback === 'function') {
            callback(this.notifications[index]);
        }
    } else {
        if (typeof callback === 'function') {
            callback(null);
        }
    }
};

AutomationController.prototype.getListProfiles = function () {
    if (this.profiles.length === 0) {
        this.profiles.push({
            id: 1,
            name: 'Default',
            description: 'This is default profile. Default profile created automatically.',
            positions: []
        })
    }
    return this.profiles;
};

AutomationController.prototype.getProfile = function (id) {
    return _.find(this.profiles, function (profile) {
            return profile.id === parseInt(id);
        }) || null;
};

AutomationController.prototype.createProfile = function (object) {
    var id = this.profiles.length ? this.profiles[this.profiles.length - 1].id + 1 : 1,
        profile = {
            id: id,
            name: object.name,
            description: object.description,
            positions: object.positions
        };

    _.defaults(profile, {
        name: '',
        description: '',
        positions: []
    });

    this.profiles.push(profile);

    this.saveConfig();
    return profile;
};

AutomationController.prototype.updateProfile = function (object, id) {
    var profile = _.find(this.profiles, function (profile) {
            return profile.id === parseInt(id);
        }),
        index,
        that = this;

    if (Boolean(profile)) {
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

        _.defaults(this.profiles[index], {
            name: '',
            description: '',
            positions: []
        });
    }

    this.saveConfig();
    return this.profiles[index];
};

AutomationController.prototype.removeProfile = function (profileId) {
    var that = this;
    this.profiles = this.profiles.filter(function (profile) {
        return profile.id !== profileId;
    });

    this.saveConfig();
};

// namespaces
AutomationController.prototype.generateNamespaces = function (callback) {
    var that = this,
        devices = that.devices.models,
        deviceTypes = _.uniq(_.map(devices, function (device) {
            return device.toJSON().deviceType;
        }));

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

    if (typeof callback === 'function') {
        callback(that.namespaces);
    }
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

AutomationController.prototype.setNamespace = function (id, data) {
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
            this.namespaces[index].params = data;
            result = this.namespaces[index];
        }
    } else {
        this.namespaces.push({
            id: id,
            params: data
        });
        result = null;
    }

    return result;
};

AutomationController.prototype.getListModulesCategories = function (id) {
    var result = null,
        categories = this.modules_categories;

    if (Boolean(id)) {
        result = _.find(categories, function (category) {
            return category.id === id;
        });
    } else {
        result = categories;
    }

    return result;
};

AutomationController.prototype.getModuleData = function (moduleId) {
    var self = this,
        defaultLang = self.defaultLang,
        metaStringify = JSON.stringify(self.modules[moduleId].meta),
        languageFile,
        data;

    try {
        languageFile = fs.loadJSON('modules/' + moduleId + '/lang/' + defaultLang + '.json');
    } catch (e) {
        try {
            languageFile = fs.loadJSON('modules/' + moduleId + '/lang/en.json');
        } catch (e) {
            languageFile = null;
        }
    }

    if (languageFile !== null) {
        Object.keys(languageFile).forEach(function (key) {
            var regExp = new RegExp('__' + key + '__', 'g');
            if (languageFile[key]) {
                metaStringify = metaStringify.replace(regExp, languageFile[key]);
            }
        });
        data = JSON.parse(metaStringify);
    } else {
        data = self.modules[moduleId].meta;
    }

    return data;
};
