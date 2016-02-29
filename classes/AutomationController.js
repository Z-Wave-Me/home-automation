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
        'X-API-VERSION',
        'Date',
        'Cache-Control',
        'If-None-Match',
        'Content-Language',
        'Accept-Language',
        'ZWAYSession'
    ];
    this.config = config.controller || {};
    this.availableLang = ['en', 'ru', 'de', 'sk', 'cz', 'se']; // will be updated by correct ISO language codes in future
    this.defaultLang = 'en';
    this.profiles = config.profiles;
    this.instances = config.instances;
    this.locations = config.locations || [];
    this.vdevInfo = config.vdevInfo || {};
    this.modules_categories = config.modules_categories || [];
    this.namespaces = namespaces || [];
    this.registerInstances = {};
    this.files = files || {};

    this.modules = {};
    this.devices = new DevicesCollection(this);

    this.notifications = [];
    this.lastStructureChangeTime = 0;

    this._loadedSingletons = [];
    
    this.auth = new AuthController(this);
}

inherits(AutomationController, EventEmitter2);

var Base64 = {
    _keyStr:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
    encode:function(e){var t="";var n,r,i,s,o,u,a;var f=0;e=Base64._utf8_encode(e);while(f<e.length){n=e.charCodeAt(f++);r=e.charCodeAt(f++);i=e.charCodeAt(f++);s=n>>2;o=(n&3)<<4|r>>4;u=(r&15)<<2|i>>6;a=i&63;if(isNaN(r)){u=a=64}else if(isNaN(i)){a=64}t=t+this._keyStr.charAt(s)+this._keyStr.charAt(o)+this._keyStr.charAt(u)+this._keyStr.charAt(a)}return t},
    decode:function(e){var t="";var n,r,i;var s,o,u,a;var f=0;e=e.replace(/[^A-Za-z0-9\+\/\=]/g,"");while(f<e.length){s=this._keyStr.indexOf(e.charAt(f++));o=this._keyStr.indexOf(e.charAt(f++));u=this._keyStr.indexOf(e.charAt(f++));a=this._keyStr.indexOf(e.charAt(f++));n=s<<2|o>>4;r=(o&15)<<4|u>>2;i=(u&3)<<6|a;t=t+String.fromCharCode(n);if(u!=64){t=t+String.fromCharCode(r)}if(a!=64){t=t+String.fromCharCode(i)}}t=Base64._utf8_decode(t);return t},
    _utf8_encode:function(e){e=e.replace(/\r\n/g,"\n");var t="";for(var n=0;n<e.length;n++){var r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r)}else if(r>127&&r<2048){t+=String.fromCharCode(r>>6|192);t+=String.fromCharCode(r&63|128)}else{t+=String.fromCharCode(r>>12|224);t+=String.fromCharCode(r>>6&63|128);t+=String.fromCharCode(r&63|128)}}return t},
    _utf8_decode:function(e){var t="";var n=0;var r=c1=c2=0;while(n<e.length){r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r);n++}else if(r>191&&r<224){c2=e.charCodeAt(n+1);t+=String.fromCharCode((r&31)<<6|c2&63);n+=2}else{c2=e.charCodeAt(n+1);c3=e.charCodeAt(n+2);t+=String.fromCharCode((r&15)<<12|(c2&63)<<6|c3&63);n+=3}}return t}
};

function wrap(self, func) {
    return function () {
        func.apply(self, arguments);
    };
}

AutomationController.prototype.init = function () {
    var self = this;


    function pushNamespaces(device, locationNspcOnly) {
        self.generateNamespaces(function (namespaces) {
            ws.push({
                type: 'me.z-wave.namespaces.update',
                data: JSON.stringify(namespaces)
            });
        }, device, locationNspcOnly);
    }

    self.loadModules(function () {
        self.emit("core.init");
        
        // update namespaces if device title has changed
        self.devices.on('change:metrics:title', function (device) {
            ws.push({
                type: "me.z-wave.devices.title_update",
                data: JSON.stringify(device.toJSON())
            });
            pushNamespaces(device, false);
        });

        // update only location namespaces if device location has changed
        self.devices.on('change:location', function (device) {
            ws.push({
                type: "me.z-wave.devices.location_update",
                data: JSON.stringify(device.toJSON())
            });
            pushNamespaces(device, true);
        });

        // update namespaces if device permanently_hidden status has changed
        self.devices.on('change:permanently_hidden', function (device) {
            ws.push({
                type: "me.z-wave.devices.visibility_update",
                data: JSON.stringify(device.toJSON())
            });
            pushNamespaces(device, false);
        });

        // update namespaces if structure of devices collection changed
        self.devices.on('created', function (device) {
            ws.push({
                type: "me.z-wave.devices.add",
                data: JSON.stringify(device.toJSON())
            });
            pushNamespaces(device);
        });

        self.devices.on('destroy', function (device) {
            ws.push({
                type: "me.z-wave.devices.destroy",
                data: JSON.stringify(device.toJSON())
            });
            pushNamespaces(device);
        });

        self.devices.on('removed', function (device) {
            pushNamespaces(device);
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
    var self = this,
        oldLang = self.defaultLang;

    self.defaultLang = self.availableLang.indexOf(lang) === -1 ? 'en' : lang;
    
    if(self.defaultLang !== oldLang) {
        this.emit('language.changed', self.defaultLang);
    }
};

AutomationController.prototype.saveConfig = function () {

    // do clean up of location namespaces 
    cleanupLocations = function (locations) {
        var newLoc = [];

        locations.forEach(function(loc){
            newLoc.push(_.omit(loc, 'namespaces'));
        });

        return newLoc;
    };

    var cfgObject = {
        "controller": this.config,
        "vdevInfo": this.vdevInfo,
        "locations": cleanupLocations(this.locations),
        "profiles": this.profiles,
        "instances": this.instances,
        "modules_categories": this.modules_categories
    };

    try {
        saveObject("config.json", cfgObject);
    } catch(e) {
        console.log("Error: can not write back config to storage: ", e);
    }
};

AutomationController.prototype.saveFiles = function () {
    saveObject("files.json", this.files);
};

AutomationController.prototype.start = function (restore) {
    var restore = restore || false;

    // if restore flag is true, overwrite config values first
    if (restore){
        console.log("Restore config...");
        // Restore config
        this.restoreConfig();
    }

    // Restore persistent data
    this.loadNotifications();

    // Run all modules
    console.log("Loading modules...");
    this.instantiateModules();

    ZAutomation = function () {
        return {status: 400, body: "Invalid ZAutomation request"};
    };
    ws.allowExternalAccess("ZAutomation", this.auth.ROLE.ANONYMOUS);

    // Run webserver
    console.log("Starting automation...");
    ZAutomation.api = new ZAutomationAPIWebRequest(this).handlerFunc();
    ws.allowExternalAccess("ZAutomation.api", this.auth.ROLE.ANONYMOUS); // there would be additional auth check for each request

    // Run storage
    console.log("Starting storage...");
    ZAutomation.storage = new ZAutomationStorageWebRequest(this).handlerFunc();
    ws.allowExternalAccess("ZAutomation.storage", this.auth.ROLE.ANONYMOUS); // there would be additional auth check for each request

    // Notify core
    this.emit("core.start");
};

AutomationController.prototype.restoreConfig = function () {    
    var restoredConfig = loadObject("config.json");

    // overwrite variables with restored data
    this.config = restoredConfig.controller || config.controller;
    this.profiles = restoredConfig.profiles || config.profiles;
    this.instances = restoredConfig.instances || config.instances;
    this.locations = restoredConfig.locations || config.locations;
    this.vdevInfo = restoredConfig.vdevInfo || config.vdevInfo;
    this.modules_categories = restoredConfig.modules_categories || config.modules_categories;
};

AutomationController.prototype.stop = function () {
    var self = this,
        modWithoutDep = [];

    // Remove API webserver
    console.log("Stopping automation...");
    ZAutomation = null;

    ws.revokeExternalAccess("ZAutomation");
    ws.revokeExternalAccess("ZAutomation.api");
    ws.revokeExternalAccess("ZAutomation.storage");

    // Clean instances
    console.log("Stopping instances with dependencies ...");
    self.instances.forEach(function (instance) {

        // first stop instances with dependencies
        if (self.modules[instance.moduleId]) {
            if ((instance.active === true || instance.active === 'true') &&
                    _.isArray(self.modules[instance.moduleId].meta.dependencies) && 
                        self.modules[instance.moduleId].meta.dependencies.length > 0) {
                self.removeInstance(instance.id);
            } else if ((instance.active === true || instance.active === 'true')){
                modWithoutDep.push(instance.id)
            }
        }
    });

    // stop instances without dependencies at least
    if (modWithoutDep.length > 0) {
        console.log("Stopping all remaining instances ...");
        modWithoutDep.forEach(function(instanceId) {
            self.removeInstance(instanceId);
        })
    }

    this._loadedSingletons = [];

    // Notify core
    this.emit("core.stop");
};

AutomationController.prototype.restart = function () {
    this.stop();
    this.start();

    var langFile = this.loadMainLang();

    this.addNotification("warning", langFile.ac_warn_restart, "core", "AutomationController");
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
    var self = this,
        langFile = self.loadMainLang(),
        values;

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
            values = moduleMetaFilename + ": " + e.toString();

        self.addNotification("error", langFile.ac_err_load_mod_json + values, "core", "AutomationController");
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
    moduleMeta.location = folder + moduleClassName;

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
        instance = null,
        langFile = self.loadMainLang(),
        values;

    if (!module) {
        self.addNotification("error", langFile.ac_err_init_module_not_found, "core", "AutomationController");
    }

    // add creation time
    if (!instanceModel.creationTime) {
        instanceModel.creationTime = Math.floor(new Date().getTime() / 1000);
    }

    if (Boolean(instanceModel.active)) {
        try {
            instance = new global[module.meta.id](instanceModel.id, self);
        } catch (e) {
            values = ((module && module.meta) ? module.meta.id : instanceModel.moduleId) + ": " + e.toString();

            self.addNotification("error", langFile.ac_err_init_module + values, "core", "AutomationController");
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

            // remove singleton entry of broken instance
            if (module.meta.singleton) {
                var index = self._loadedSingletons.indexOf(module.meta.id);
                
                if(index > -1) {
                    self._loadedSingletons.splice(index, 1);
                }
            }

            values = ((module && module.meta) ? module.meta.id : instanceModel.moduleId) + ": " + e.toString();

            self.addNotification("error", langFile.ac_err_init_module + values, "core", "AutomationController");
            console.log(e.stack);
            return null; // not loaded
        }

        self.registerInstance(instance);
        return instance;
    }
};

AutomationController.prototype.loadModule = function (module, rootModule) {
    var langFile = this.loadMainLang(),
        values;

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
            values = dep + " :: " + module.meta.id;

            var depModule = this.modules[dep];
            if (!depModule) {
                this.addNotification("error", langFile.ac_err_dep_not_found + values, "core", "AutomationController");
                module.failed = true;
                return false;
            }

            if (!this.loadModule(depModule, rootModule)) {
                this.addNotification("error", langFile.ac_err_dep_not_loaded + values, "core", "AutomationController");
                module.failed = true;
                return false;
            }

            if (!this.loadedModules.some(function (x) {
                    return x.meta.id === dep;
                })) {
                
                this.addNotification("error", langFile.ac_err_dep_not_init + values, "core", "AutomationController");
                module.failed = true;
                return false;
            }
        }
    }

    console.log("Loading module " + module.meta.id + " from " + module.location);
    try {
        executeFile(module.location + "/index.js");
    } catch (e) {
        values = module.meta.id + ": " + e.toString();

        this.addNotification("error", langFile.ac_err_file_load + values, "core", "AutomationController");
        console.log(e.stack);
        module.failed = true;
        return false; // skip this modules
    }

    if (!_module) {
        values = module.meta.id;

        this.addNotification("error", langFile.ac_err_invalid_module + values, "core", "AutomationController");
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
};

AutomationController.prototype.unloadModule = function (moduleId) {
    var self = this,
        activeInstances = [],
        result = 'failed';

    try {
        // filter for instances of moduleId
        activeInstances = self.instances.filter(function (instance) {
            return instance.moduleId === moduleId;
        }).map(function (instance) {
            return instance.id;
        });

        // remove all instances of moduleId
        if (activeInstances.length > 0) {
            activeInstances.forEach(function (instanceId) {
                self.deleteInstance(instanceId);
            });
        }

        //remove from loaded Modules
        self.loadedModules = self.loadedModules.filter(function (module) {
            return module.meta.id !== moduleId;
        });

        // remove from modules list
        if (self.modules[moduleId]){
            delete self.modules[moduleId];

            result = 'success';
        }
    } catch (e) {
        result = e;
    }

    return result;
};

AutomationController.prototype.loadInstalledModule = function (moduleId, rootDirectory) {
    var self = this,
        successful = false;

    try{
        if(fs.list(rootDirectory + moduleId) && fs.list(rootDirectory + moduleId).indexOf('index.js') !== -1){
            console.log('Load app "' + moduleId + '" from folder ...');
            self.loadModuleFromFolder(moduleId, rootDirectory);

            if(self.modules[moduleId]){
                self.loadModule(self.modules[moduleId]);

                successful = true;
            }
        }
    } catch (e){
        console.log('Load app "' + moduleId + '" has failed. ERROR:', e);
    }

    return successful;
};

AutomationController.prototype.reinitializeModule = function (moduleId, rootDirectory) {
    var self = this,
        successful = false,
        existingInstances = [];

    // filter for active instances of moduleId
    existingInstances = self.instances.filter(function (instance) {
        return instance.moduleId === moduleId;
    });

    // remove all active instances of moduleId
    existingInstances.forEach(function (instance) {
        self.deleteInstance(instance.id);
    });

    // try to reinitialize app
    try{
        if(fs.list(rootDirectory + moduleId) && fs.list(rootDirectory + moduleId).indexOf('index.js') !== -1){
            console.log('Load app "' + moduleId + '" from folder ...');
            self.loadModuleFromFolder(moduleId, rootDirectory);

            if(self.modules[moduleId]){

                self.loadModule(self.modules[moduleId]);

                // add and start instances of moduleId again
                existingInstances.forEach(function (instance) {
                    self.createInstance(instance);
                });

                successful = true;
            }
        }
    } catch (e){
        console.log('Load app "' + moduleId + '" has failed. ERROR:', e);
    }

    return successful;
};

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
    var self = this,
        langFile = this.loadMainLang();

    if (!!instance) {
        var instanceId = instance.id,
            isExistInstance = self.registerInstances.hasOwnProperty(instanceId);

        if (!isExistInstance) {
            self.registerInstances[instanceId] = instance;
            self.emit('core.instanceRegistered', instanceId);
        } else {
            self.emit('core.error', new Error(langFile.ac_err_instance_already_exists + instanceId));
        }
    } else {
        self.emit('core.error', new Error(langFile.ac_err_instance_empty + instance.id));
    }
};

AutomationController.prototype.listInstances = function (){
    var self = this,
        expInstances = [];

    if(self.instances) {
        self.instances.forEach(function (instance){
            var moduleJSON = self.getModuleData(instance.moduleId);

            expInstances.push(_.extend(instance, {
                state : moduleJSON.state || null,
                module : moduleJSON.defaults && moduleJSON.defaults.title || null,
                title : (!instance.title || instance.title === '') ? ((moduleJSON.defaults && moduleJSON.defaults.title) ? moduleJSON.defaults.title : "?") : instance.title
            }));
        });
    } else {
        expInstances = null;
    }

    return expInstances;
}

AutomationController.prototype.createInstance = function (reqObj) {
    //var instance = this.instantiateModule(id, className, config),
    var self = this,
        langFile = this.loadMainLang(),
        id = self.instances.length ? self.instances[self.instances.length - 1].id + 1 : 1,
        instance = null,
        module = _.find(self.modules, function (module) {
            return module.meta.id === reqObj.moduleId;
        }),
        result,
        alreadyExisting = [];

    if (!!module) {

        if (reqObj.id) {
            alreadyExisting = _.filter(this.instances, function(inst){
                return inst.id === reqObj.id
            });
        }

        instance = _.extend(reqObj, { 
            id: alreadyExisting[0]? alreadyExisting[0].id : id
        });

        self.instances.push(instance);
        self.saveConfig();
        self.emit('core.instanceCreated', id);
        result = self.instantiateModule(instance);

        // remove instance from list if broken
        if (result === null) {
            var currIndex = self.instances.length ? self.instances.length - 1 : 0;
            
            self.instances.splice(currIndex, 1);
            self.saveConfig();
            self.emit('core.instanceDeleted', id);
        }        
    } else {
        self.emit('core.error', new Error(langFile.ac_err_create_instance + reqObj.moduleId + " :: " + id));
        result = false;
    }

    return result;
};

AutomationController.prototype.stopInstance = function (instance) {
    var self = this,
        langFile = this.loadMainLang(),
        instId = instance.id,
        values;

    try {
        instance.stop();
        delete this.registerInstances[instId];

        // get all devices created by instance 
        instDevices = _.map(this.devices.filter(function (dev) {
            return dev.get('creatorId') === instId;
        }), function (dev) {
            return dev.id;
        });

        // cleanup devices 
        if (instDevices.length > 0) {
            instDevices.forEach(function (id) {
                // check for device entry again
                if (!!self.devices.get(id)) {
                    self.devices.remove(id);
                }
            });
        }

    } catch (e) {
        values = ((instance && instId) ? instId : "<unknow id>") + ": " + e.toString();

        this.addNotification("error", langFile.ac_err_stop_mod + values, "core", "AutomationController");
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
    var langFile = this.loadMainLang(),
        register_instance = this.registerInstances[id],
        instance = _.find(this.instances, function (model) {
            return model.id === id;
        }),
        index = this.instances.indexOf(instance),
        config = {},
        result;

    if (instance) {
        if (register_instance) {
            this.stopInstance(register_instance);
        }

        if(instanceObject.hasOwnProperty('params')){
            if(Object.keys(instanceObject.params).length === 0){
                config = instanceObject.params;
            }else {
                for (var property in instance.params) {
                    config[property] = instanceObject.params.hasOwnProperty(property) && instanceObject.params[property] !== instance.params[property]? instanceObject.params[property] :instance.params[property];
                }
            }
        }

        _.extend(this.instances[index], {
            title: instanceObject.hasOwnProperty('title')? instanceObject.title : instance.title,
            description: instanceObject.hasOwnProperty('description')? instanceObject.description : instance.description,
            active: instanceObject.hasOwnProperty('active')? instanceObject.active : instance.active,
            params: config !== {}? config : instance.params
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
        this.emit('core.error', new Error(langFile.ac_err_refonfigure_instance + id));
    }

    this.saveConfig();
    return result;
};

AutomationController.prototype.removeInstance = function (id) {
    var instance = this.registerInstances[id],
        instanceClass = id,
        instDevices = [];


    if (!!instance) {
        this.stopInstance(instance);
        this.emit('core.instanceStopped', id);
        this.saveConfig();
    }
};

AutomationController.prototype.deleteInstance = function (id) {
    var instDevices = [],
        self = this;
    
    // get all devices created by instance 
    instDevices = _.map(this.devices.filter(function (dev) {
        return dev.get('creatorId') === id;
    }), function (dev) {
        return dev.id;
    });
    
    this.removeInstance(id);

    this.instances = this.instances.filter(function (model) {
        return id !== model.id;
    });

    // cleanup 
    if (instDevices.length > 0) {
        instDevices.forEach(function (id) {
            // check for vDevInfo entry
            if (self.vdevInfo[id]) {
                self.devices.cleanup(id);
            }
        });
    }

    this.saveConfig();
    this.emit('core.instanceDeleted', id);
};

AutomationController.prototype.deviceExists = function (vDevId) {
    return Object.keys(this.devices).indexOf(vDevId) >= 0;
};

AutomationController.prototype.getVdevInfo = function (id) {
    return this.vdevInfo[id] || {};
};

AutomationController.prototype.setVdevInfo = function (id, device) {
    this.vdevInfo[id] = _.pick(device, "deviceType", "metrics", "location", "tags", "permanently_hidden", "creationTime");
    this.saveConfig();
    return this.vdevInfo[id];
};

AutomationController.prototype.clearVdevInfo = function (id) {
    delete this.vdevInfo[id];
    this.saveConfig();
};

AutomationController.prototype.saveNotifications = function () {
    saveObject("notifications", this.notifications);
};

AutomationController.prototype.loadNotifications = function () {
    this.notifications = loadObject("notifications") || [];
};

AutomationController.prototype.addNotification = function (severity, message, type, source) {
    var now = new Date(),
        notice = {
            id: Math.floor(now.getTime() /1000),
            timestamp: now.toISOString(),
            level: severity,
            message: message, 
            type: type || 'device',
            source: source,
            redeemed: false,
            // add unified hash - produces with source, cause timestamp in sec is not unique ...
            h: this.hashCode(source)
        };

    if(typeof message === 'object'){
        msg = JSON.stringify(message);
    }else{
        msg = message;
    }

    this.notifications.push(notice);
    //this.saveNotifications();
    this.emit("notifications.push", notice); // notify modules to allow SMS and E-Mail notifications
    console.log("Notification:", severity, "(" + type + "):", msg);
};

AutomationController.prototype.deleteNotifications = function (id, before, uid, callback, removeNotification) {
    var that = this,
        ids = [],
        newNotificationList = [];
    
    if (removeNotification) {
        id = parseInt(id) || 0;
        before = Boolean(before);
        uid = parseInt(uid) || 0;

        if(id !== 0 && uid !== 0 && before === false){
            newNotificationList = that.notifications.filter(function (notification) {
                return notification.id !== id && notification.h !== uid;
            });
            console.log('---------- notification with id ' + id + ' deleted ----------');
        }

        if(id !== 0 && before === true){
            newNotificationList = that.notifications.filter(function (notification) {
                return notification.id >= id;
            });
            console.log('---------- all notifications before ' + id + ' deleted ----------');
        }

        that.notifications = newNotificationList;    
    
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

    that.saveNotifications();
};

AutomationController.prototype.getLocation = function (locations, locationId) {
    var location = [],
        nspc = null;

    location = locations.filter(function (location) {
        if (locationId === 'globalRoom') {
            return location.id === 0 &&
                    location.title === locationId;
        } else {
            return location.id === locationId;
        }
    });

    return location[0]? location[0] : null;
}

AutomationController.prototype.addLocation = function (locProps, callback) {
    var id = this.locations.length > 0 ? Math.max.apply(null, this.locations.map(function (location) { return location.id; })) + 1 : 1; // changed after adding global room with id=0 || old: this.locations.length ? this.locations[this.locations.length - 1].id + 1 : 1;
    var locations = this.locations.filter(function (location) {
        return location.id === id;
    });

    if (locations.length > 0) {
        if (typeof callback === 'function') {
            callback(false);
        }
    } else {

        var location = {
            id: id,
            title: locProps.title,
            user_img: locProps.user_img || '',
            default_img: locProps.default_img || '',
            img_type: locProps.img_type || ''
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
    var self = this,
        langFile = this.loadMainLang(),
        locations = this.locations.filter(function (location) {
        return location.id === id;
    });
    if (locations.length > 0) {
        Object.keys(this.devices).forEach(function (vdevId) {
            var vdev = self.devices[vdevId];
            if (vdev.location === id) {
                vdev.location = 0;
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
        this.emit('core.error', new Error(langFile.ac_err_location_not_found));
    }
};

AutomationController.prototype.updateLocation = function (id, title, user_img, default_img, img_type, callback) {
    var langFile = this.loadMainLang(),
        locations = this.locations.filter(function (location) {
            return location.id === id;
        });

    if (locations.length > 0) {
        location = this.locations[this.locations.indexOf(locations[0])];

        location.title = title;
        if (typeof user_img === 'string' && user_img.length > 0) {
            location.user_img = user_img;
        }
        if (typeof default_img === 'string' && default_img.length > 0) {
            location.default_img = default_img;
        }
        if (typeof img_type === 'string' && img_type.length > 0) {
            location.img_type = img_type;
        }
        if (typeof callback === 'function') {
            callback(location);
        }

        this.saveConfig();
        this.emit('location.updated', id);
    } else {
        if (typeof callback === 'function') {
            callback(false);
        }
        this.emit('core.error', new Error(langFile.ac_err_location_not_found));
    }
};

AutomationController.prototype.listNotifications = function (since, to) {
    var now = new Date();
    
    since = parseInt(since) || 0;
    to = parseInt(to) || Math.floor(now.getTime() /1000);

    return this.notifications.filter(function (notification) {
        return notification.id >= since && notification.id <= to;
    });
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
        if (typeof callback === 'function') {
            callback(this.notifications[index]);
        }
    } else {
        if (typeof callback === 'function') {
            callback(null);
        }
    }
};

AutomationController.prototype.listHistories = function () {
    var self = this;

    return self.history;
};

AutomationController.prototype.getDevHistory = function (dev, since, show) {
    var filteredEntries = [],
        averageEntries = [],
        entries = [],
        now = Math.floor(new Date().getTime() / 1000),
        l = 0,
        cnt = 0,
        metric = {},
        since = since? since : 0,
        items = show? show : 0,
        sec = 0;

    // create output with n (= show) values - 288, 96, 48, 24, 12, 6
    if(items > 0 && items <= 288){
        sec = 86400 / show; // calculate seconds of range
        
        // calculate averaged value of all meta values between 'sec' range
        for (i = 0; i < items; i++){
            from = now - sec*(items - i);
            to = now - sec*(items - (i+1));

            // filter values between from and to
            range = dev[0]['mH'].filter(function (metric){
                return metric.id >= from && metric.id <= to;
            });

            cnt = range.length;
            
            // calculate level
            if(cnt > 0){

                for(j=0; j < cnt; j++){
                    l += range[j]['l'];
                }

                switch(dev[0]['dT']){
                    case 'sensorBinary':
                    case 'switchBinary':
                    case 'doorlock':
                        l = 0 < (l/cnt) && (l/cnt) < 1? 0.5 : (l/cnt); // set 0, 0.5 or 1 if status is binary
                        break;
                    default:
                        l = l /cnt;
                        
                        if(l === +l && l !== (l|0)) { // round to one position after '.'
                            l = l.toFixed(1);
                        }
                        break;
                }
            }else {
                l = null;
            }            

            metric = {
                id: to,
                l: parseFloat(l)
            }

            averageEntries.push(metric);
            
            l = 0;
            metric = {};
        }

        entries = averageEntries;
    } else {
        entries = dev[0]['mH'];
    }

    // filter meta entries by since
    filteredEntries = since > 0? entries.filter(function (metric) {
            return metric.id >= since;
        }) : entries;

    return filteredEntries;
};

AutomationController.prototype.getListProfiles = function () {
    var getProfiles = [];

    this.profiles.forEach(function (profile){
        var prof = {},
            excl = ["login", "password", "role"];
        
        for (var property in profile) {
            if(excl.indexOf(property) === -1){
                prof[property] = profile[property];
            }
        }

        getProfiles.push(prof);
    });
    return getProfiles;
};

AutomationController.prototype.getProfile = function (id) {
    return _.find(this.profiles, function (profile) {
            return profile.id === parseInt(id);
        }) || null;
};

AutomationController.prototype.createProfile = function (profile) {
    var id = this.profiles.length ? this.profiles[this.profiles.length - 1].id + 1 : 1,
        globalRoom = [0];
    
    profile.id = id;
    profile.rooms = profile.rooms.indexOf(0) > -1? profile.rooms : profile.rooms.concat(globalRoom);

    this.profiles.push(profile);

    this.saveConfig();
    return profile;
};

AutomationController.prototype.updateProfile = function (object, id) {
    var profile = _.find(this.profiles, function (profile) {
            return profile.id === parseInt(id);
        }),
        index;
    
    if (profile) {
        index = this.profiles.indexOf(profile);
        
        for (var property in object) {
            if (object.hasOwnProperty(property) && profile.hasOwnProperty(property)) {
                this.profiles[index][property] = object[property];
            }
        }
    }
    
    this.saveConfig();
    return this.profiles[index];
};

AutomationController.prototype.updateProfileAuth = function (object, id) {
    var profile = _.find(this.profiles, function (profile) {
            return profile.id === parseInt(id);
        }),
        index;

    if (profile) {
        index = this.profiles.indexOf(profile);

        p = this.profiles[index];
        
        if (object.hasOwnProperty('password') && object.password !== '' && !!object.password) {
            p.password = object.password;
        }
        if (object.hasOwnProperty('login') && object.login !== '' && !!object.login) {
            p.login = object.login;
        }

        this.saveConfig();
        
        return p;
    } else {
        return null;
    }
};

AutomationController.prototype.removeProfile = function (profileId) {
    var that = this;
    this.profiles = this.profiles.filter(function (profile) {
        return profile.id !== profileId;
    });

    this.saveConfig();
};

// namespaces
AutomationController.prototype.generateNamespaces = function (callback, device, locationNspcOnly) {
    var that = this,
        devStillExists = that.devices.get(device.id),
        locationNspcOnly = locationNspcOnly? locationNspcOnly : false,
        nspcArr = [],
        locNspcArr = [],
        devLocation = device.get('location'),
        location = that.getLocation(that.locations, devLocation),
        devHidden = device.get('permanently_hidden');

        if (!!location && !location.namespaces) {
            location.namespaces = [];
        }

    if (device) {

        this.genNspc = function (nspc,vDev) {
            var devTypeEntry = 'devices_' + vDev.get('deviceType'),
                devProbeType = vDev.get('probeType'),
                devEntry = {
                    deviceId: vDev.id,
                    deviceName: vDev.get('metrics:title')
                },
                addRemoveEntry = function (entryArr) {
                    var exists = [];
                    
                    // check if entry already exists
                    exists = _.filter(entryArr, function(entry) {
                        return entry.deviceId === devEntry.deviceId;
                    });

                    if (!!devStillExists && exists.length < 1 && !devHidden){
                        // add entry
                        entryArr.push(devEntry);
                    } else if (!!devStillExists && exists[0] && !devHidden) {
                        // change existing deviceName
                        if (!_.isEqual(exists[0]['deviceName'], devEntry['deviceName'])) {
                            exists[0]['deviceName'] = devEntry['deviceName'];
                        }
                    } else if (devStillExists === null || devHidden) {
                        // remove entry
                        entryArr = _.filter(entryArr, function(entry) {
                            return entry.deviceId !== devEntry.deviceId;
                        });
                    }

                    return entryArr;
                },
                deleteEmptyProp = function (object, key) {
                    // delete empty CC type entries
                    if ((_.isArray(object[key]) && object[key].length < 1) || (!_.isArray(object[key]) && Object.keys(object[key]).length < 1)) {
                        delete object[key];
                    }
                    return object;
                },
                cutType = [],
                cutSubType = '',
                paramEntry;

            // check for type entry
            typeEntryExists = _.filter(nspc, function(typeEntry){
                return typeEntry.id === devTypeEntry;
            });

            if (typeEntryExists.length > 0) {
                paramEntry = typeEntryExists[0] && typeEntryExists[0].params? typeEntryExists[0].params : paramEntry;
            }

            // generate probetype entries
            if (devProbeType !== '') {
                cutType = devProbeType === 'general_purpose'? devProbeType.split() : devProbeType.split('_'),
                cutSubType = devProbeType.substr(cutType[0].length + 1);

                paramEntry = paramEntry? paramEntry : {};

                // create 'none' entry to get an object with array of 'none probetype' entries
                if (_.isArray(paramEntry)){
                    paramEntry = {
                        none: paramEntry
                    };
                }

                // check for CC sub type and add device namespaces
                if(cutType.length > 1){

                    if(!paramEntry[cutType[0]]){
                        paramEntry[cutType[0]] = {};
                    }

                    if(!paramEntry[cutType[0]][cutSubType]){
                        paramEntry[cutType[0]][cutSubType] = [];
                    }

                    //check if entry is already there
                    paramEntry[cutType[0]][cutSubType] = addRemoveEntry(paramEntry[cutType[0]][cutSubType]);

                    // delete empty suptype entries
                    paramEntry[cutType[0]] = deleteEmptyProp(paramEntry[cutType[0]], cutSubType);
                
                // add CC type
                } else {
                    if(!paramEntry[cutType[0]]){
                        paramEntry[cutType[0]] = [];
                    }

                    //check if entry is already there
                    paramEntry[cutType[0]] = addRemoveEntry(paramEntry[cutType[0]]);
                }

                // remove CC if empty
                paramEntry = deleteEmptyProp(paramEntry, cutType[0]);

            } else {
                // add entries to type entries
                paramEntry = paramEntry? paramEntry : [];

                // create 'none' entry to get an object with array of 'none probetype' entries
                if (_.isArray(paramEntry)){
                    paramEntry = {
                        none: paramEntry
                    };
                } else if(!_.isArray(paramEntry) && devProbeType === ''){
                    paramEntry['none'] = paramEntry['none']? paramEntry['none'] : [];
                }

                paramEntry.none = addRemoveEntry(paramEntry.none);
            }

            // delete 'none' entry if it exists as a single entry
            if (!_.isArray(paramEntry) && Object.keys(paramEntry).length === 1 && paramEntry['none']) {
                paramEntry = paramEntry['none'];
            }

            // set namespaces
            that.setNamespace(devTypeEntry, nspc, paramEntry);

            // check for 'devices_all'
            devicesAll = _.filter(nspc, function(entries) {
                return entries.id === 'devices_all';
            });

            // add 'devices_all' with entries
            if (devicesAll.length < 1) {
                that.setNamespace('devices_all', nspc, [devEntry]);
            } else if (devicesAll[0].params && _.isArray(devicesAll[0].params)) {
                //check if entry is already there
                devicesAll[0].params = addRemoveEntry(devicesAll[0].params);
            }

            return nspc;
        };

        // no location change
        if (!!location && !locationNspcOnly) {
            //locNspcArr = that.genNspc(location.namespaces, device);

            // update locations namespaces
            _.forEach(that.locations, function(l) {
                if(l.id === devLocation) {
                    // add to namespace
                    l.namespaces = that.genNspc(location.namespaces, device);
                }
            });
        // if location of device has changed
        } else if (locationNspcOnly) {
            _.forEach(that.locations, function(l) {
                //set namespaces if necessary
                if (!l.namespaces) {
                    l.namespaces = [];
                }

                if(l.id === devLocation) {
                    // add to namespace
                    devStillExists = that.devices.get(device.id);
                    l.namespaces = that.genNspc(l.namespaces, device);
                } else {
                    // remove from the other namespaces
                    devStillExists = null;
                    l.namespaces = that.genNspc(l.namespaces, device);
                }
            });
        }
        // update namespace
        if (!locationNspcOnly) {
            nspcArr = that.genNspc(that.namespaces, device);

            if (typeof callback === 'function') {
                callback(nspcArr);
            }
        } else {
            if (typeof callback === 'function') {
                callback(locNspcArr);
            }
        }

    } else {
        if (typeof callback === 'function') {
            callback(nspcArr);
        }
    }
};

AutomationController.prototype.getListNamespaces = function (path, namespacesObj) {
    var self = this,
        result = [],
        namespaces = namespacesObj,
        path = path || null,
        pathArr = [],
        namespacesPath = '',
        nspc;

    this.getNspcDevAll = function(nspcObj) {
        var devicesAll = [],
            obj = {};

        if (_.isArray(nspcObj)){
            nspcObj.forEach(function(nspcEntry) {
                if (!~devicesAll.indexOf(nspcEntry)){
                    devicesAll.push(nspcEntry);
                }
            });
        } else {
            for ( var prop in nspcObj) {
                devicesAll = devicesAll.concat(self.getNspcDevAll(nspcObj[prop]));
            }
        }

        return devicesAll;
    };

    if (!!path && namespaces) {

        pathArr = path.split('.');

        // add 'params' to path array if neccessary
        if (pathArr.length > 1 && pathArr.indexOf('params') === -1) {
            pathArr.splice(1, 0, 'params');
        }
        
        // filter for type
        nspc = namespaces.filter(function (namespace) {
            return namespace.id === pathArr[0];
        })[0];

        //nspc = nspc[0]? nspc[0] : nspc;

        // get object/array by path
        if (nspc && pathArr.length > 1) {
            var shift = 1;
            for (var i = 0; i < pathArr.length; i++) {
                var currPath = pathArr[i + shift],
                    obj = {},
                    lastPath = ['deviceId', 'deviceName'];
                
                if(nspc[currPath]) {
                    nspc = nspc[currPath];
                    result = nspc;
                
                } else if (!nspc[currPath] && ~lastPath.indexOf(currPath)) {
                    result = self.getNspcDevAll(nspc);

                    result = _.uniq(result.map(function(entry){
                        return entry[currPath];
                    }));
                // add backward compatibility
                } else if (~lastPath.indexOf(currPath)) {

                    if (_.isArray(nspc)){
                        // map all device id's or device names
                        result = _.map(nspc, function(entry) { return entry[currPath] });
                    }
                } else if (!nspc[currPath] && nspc['devices_all'] && i < 1) {
                    nspc = nspc['devices_all'];
                    result = nspc;
                    // change shift to get last path entry
                    shift = 0;
                } else if (currPath && !nspc[currPath] && i > 0) {
                    nspc = [];
                    result = nspc;

                    break;
                } else if (currPath) {
                    result = nspc;
                }
            }
        } else {
            result = nspc && nspc['params']? nspc['params'] : nspc; // if not return undefined
        }        
        
    } else {
        result = namespaces;
    }

    return result;
};

AutomationController.prototype.setNamespace = function (id, namespacesArr, data) {
    var result = null,
        namespace,
        index;

    id = id || null;

    if (id && this.getListNamespaces(id, namespacesArr)) {
        namespace = _.findWhere(namespacesArr, {id : id});
        if (!!namespace) {
            index = namespacesArr.indexOf(namespace);
            
            // remove entry if data is empty
            if (~index && (_.isArray(data) && data.length < 1) || ((!_.isArray(data)) && Object.keys(data).length < 1)) {
                namespacesArr = namespacesArr.splice(index, 1);
                result = namespacesArr;
            } else {
                namespacesArr[index].params = data;
                result = namespacesArr[index];
            }
        }
    } else if ((_.isArray(data) && data.length > 0) || ((!_.isArray(data)) && Object.keys(data).length > 0)) {
        namespacesArr.push({
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

AutomationController.prototype.getModuleData = function (moduleName) {
    var self = this,
        defaultLang = self.defaultLang,
        moduleMeta = self.modules[moduleName] && self.modules[moduleName].meta || null,
        languageFile = self.loadModuleLang(moduleName),
        data = {};
    
    if (!self.modules[moduleName]) {
        return {}; // module not found (deleted from filesystem or broken?), return empty meta
    }
    
    try {
        metaStringify = JSON.stringify(moduleMeta);
    } catch(e){
        try {
            metaStringify = JSON.stringify(fs.loadJSON('modules/' + moduleName + '/module.json'));
        } catch(e){
            try {
                metaStringify = JSON.stringify(fs.loadJSON('userModules/' + moduleName + '/module.json'));
            } catch(e){
                console.log('Cannot load lang file from module ' + moduleName + '. ERROR: ' + e);
            }
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
        data = self.modules[moduleName].meta;
    }

    return data;
};

AutomationController.prototype.replaceNamespaceFilters = function (moduleMeta) {
    var self = this,
        moduleMeta = moduleMeta || null,
        langFile = this.loadMainLang();

    // loop through object
    function replaceNspcFilters (moduleMeta, obj, keys) {
        var objects = [];

        for (var i in obj) {
            if (obj && !obj[i]){
                continue;
            }
            if ((i === 'properties' || i === 'fields') && typeof obj[i] === 'object' && obj[i]['room'] && obj[i]['devicesByRoom']) {
                var k = _.keys(obj[i])
                    newObj = {};

                try {
                    // overwrite old key with new namespaces array
                    if (i === 'properties') {
                        console.log("Room - Device relation found, try to preparate JSON's schema structure ...");

                        var dSRoom = _.extend({
                                "type":"",
                                "field":"",
                                "datasource":"",
                                "enum":"",
                                "title":""
                            }, obj[i]['room']),
                            dSDevByRoom = _.extend({
                                "type":"",
                                "datasource":"",
                                "enum":"",
                                "title":"",
                                "dependencies":""
                            }, obj[i]['devicesByRoom']);

                        if (dSRoom['enum'] && !_.isArray(dSRoom['enum'])){
                            dSRoom['enum'] = getNspcFromFilters(moduleMeta, dSRoom['enum']);

                            obj[i]['room'] = dSRoom;
                        }

                        if (dSDevByRoom['enum'] && !_.isArray(dSDevByRoom['enum']) && _.isArray(dSRoom['enum'])){
                            var path = dSDevByRoom['enum'].substring(21).replace(/:/gi, '.');
                            if(k.length > 0) {
                                k.forEach(function(key) {
                                    if(key === 'devicesByRoom') {
                                        dSRoom['enum'].forEach(function(roomId, index) {
                                            var locNspc = [],
                                                nspc =[];

                                            location = self.getLocation(self.locations, roomId);

                                            if (!!location) {
                                                nspc = self.getListNamespaces(path, location.namespaces);
                                            }

                                            dSDevByRoom['enum'] = nspc && nspc.length > 0? nspc: [langFile.no_devices_found];
                                            dSDevByRoom['dependencies'] = "room";

                                            newObj['devicesByRoom_' + roomId] = _.clone(dSDevByRoom);
                                            if (newObj['devicesByRoom_' + roomId]['title']) {
                                                newObj['devicesByRoom_' + roomId]['title'] = newObj['devicesByRoom_' + roomId]['title'] + '_' + roomId;
                                            }
                                        });
                                    } else {
                                        newObj[key] = obj[i][key];
                                    }
                                });
                            }

                            obj[i] = newObj;
                        }
                    } else {
                        console.log("Room - Device relation found, try to preparate JSON's options structure ...");

                        var dSRoom = _.extend({
                                "type":"",
                                "field":"",
                                "optionLabels":""
                            },obj[i]['room']),
                            dSDevByRoom = _.extend({
                                "dependencies": {},
                                "type":"",
                                "field":"",
                                "optionLabels":""
                            },obj[i]['devicesByRoom']);

                        if (dSRoom['optionLabels'] && !_.isArray(dSRoom['optionLabels'])){
                            dSRoom['optionLabels'] = getNspcFromFilters(moduleMeta, dSRoom['optionLabels']);

                            obj[i]['room'] = dSRoom;
                        }

                        if (dSDevByRoom['optionLabels'] && !_.isArray(dSDevByRoom['optionLabels']) && _.isArray(dSRoom['optionLabels'])){
                            var path = dSDevByRoom['optionLabels'].substring(21).replace(/:/gi, '.');
                            if(k.length > 0) {
                                k.forEach(function(key) {
                                    if(key === 'devicesByRoom') {
                                        dSRoom['optionLabels'].forEach(function(roomName, index) {
                                    
                                            var locNspc = [],
                                                nspc = [],
                                                locationId;

                                            location = self.locations.filter(function(location){ return location.title === roomName });
                                            locationId = location[0]? location[0].id : location.id;

                                            if (location[0]) {
                                                nspc = self.getListNamespaces(path, location[0].namespaces);
                                            }
                                            
                                            dSDevByRoom['optionLabels'] = nspc && nspc.length > 0? nspc: [langFile.no_devices_found];
                                            dSDevByRoom['dependencies'] = { "room" : locationId };

                                            newObj['devicesByRoom_' + locationId] = _.clone(dSDevByRoom);

                                            if (newObj['devicesByRoom_' + locationId]['label']) {
                                                newObj['devicesByRoom_' + locationId]['label'] = newObj['devicesByRoom_' + locationId]['label'] + '_' + locationId;
                                            }
                                        });
                                    } else {
                                        newObj[key] = obj[i][key];
                                    }
                                });
                            }

                            obj[i] = newObj;
                        }
                    }

                } catch (e) {
                    console.log('Cannot prepare Room-Device related JSON structure. ERROR: ' + e);
                    self.addNotification('warning', langFile.err_preparing_room_dev_structure, 'module', moduleMeta.id);
                }
                
                // try to replace the other stuff
                for (var key in obj[i]) {
                    _.each(obj[i][key], function(p, index){
                        if (~keys.indexOf(index) && !_.isArray(p)) {
                            obj[i][key][index] = getNspcFromFilters(moduleMeta, obj[i][key][index]);
                        }
                    });
                }
            } else if (typeof obj[i] === 'object') {
                objects = objects.concat(replaceNspcFilters(moduleMeta, obj[i], keys));
            } else if (keys.indexOf(i) > -1 && !_.isArray(obj[i])) {
                // overwrite old key with new namespaces array
                obj[i] = getNspcFromFilters(moduleMeta, obj[i]);
            }
        }

        return obj;
    };

    // generate namespace arry from filter string 
    function getNspcFromFilters (moduleMeta, nspcfilters) {
        var namespaces = [],
            filters = nspcfilters.split(','),
            apis = ['locations','namespaces','loadFunction'],
            filteredDev = [];

        try {

            if (!_.isArray(filters)) {
                return false;
            }

            // do it for each filter
            _.forEach(filters, function (flr,i){
                var id = flr.split(':'),
                    path;

                if(apis.indexOf(id[0]) > -1){
                    
                    // get location ids or titles - except location 0/globalRoom - 'locations:id' or 'locations:title'
                    // should allow dynamic filtering per location
                    if (id[0] === 'locations' && (id[1] === 'id' || id[1] === 'title')) {
                        namespaces = _.filter(self.locations, function(location) {
                            return location[id[1]] !== 0 && location[id[1]] !== 'globalRoom';
                        }).map(function(location) { 
                                return location[id[1]];
                        });
                    
                    // get namespaces of devices per location - 'locations:locationId:filterPath'                   
                    } else if (id[0] === 'locations' && id[1] === 'locationId'){
                        // don't replace set filters instead
                        namespaces = nspcfilters;

                    // load function from file
                    } else if (id[0] === 'loadFunction') {
                        var filePath = moduleMeta.location + '/htdocs/js/' + id[1],
                            jsFile = fs.stat(filePath);
                        
                        if (id[1] && jsFile && jsFile.type === 'file') {
                            jsFile = fs.load(filePath);

                            if (!!jsFile) {
                               //compress string 
                               namespaces = jsFile.replace(/\s\s+|\t/g,' ');
                            }
                        }
                    
                    // get namespaces of devices ignoring locations
                    } else {
                        // cut path
                        path = flr.substring(id[0].length + 1).replace(/:/gi, '.');

                        // get namespaces
                        nspc = self.getListNamespaces(path, self.namespaces);
                        if (nspc) {
                            namespaces = namespaces.concat(nspc);
                        }
                    }
                }
            });
            return namespaces;

        } catch (e) {
            console.log('Cannot parse filters > ' + nspcfilters + ' < from namespaces. ERROR: ' + e);
            self.addNotification('warning', langFile.err_parsing_npc_filters, 'module', moduleMeta.id);
            
            return namespaces;
        }
    };

    if (!!moduleMeta) {
        var params = {
                schema: ['enum'],
                options: ['optionLabels', 'onFieldChange', 'click'],
                postRender : ''
            };
        
        // transform filters
        for (var property in params) {
            if (property === 'postRender' && moduleMeta[property] && !_.isArray(moduleMeta[property])) {                           
                moduleMeta[property] = getNspcFromFilters(moduleMeta, moduleMeta[property]);
            } else if (moduleMeta[property]) {                           
                moduleMeta[property] = replaceNspcFilters(moduleMeta, moduleMeta[property], params[property]);
            }
        }
    }

    return moduleMeta;
};

// load module lang folder
AutomationController.prototype.loadModuleLang = function (moduleId) {
    var moduleMeta = this.modules[moduleId] && this.modules[moduleId].meta || null,
        languageFile = null;

        if(!!moduleMeta){
            languageFile = this.loadMainLang(moduleMeta.location + '/');
        }

    return languageFile;
};

// load lang folder with given prefix
AutomationController.prototype.loadMainLang = function (pathPrefix) {
    var self = this,
        languageFile = null,
        prefix;

    if(pathPrefix === undefined || pathPrefix === null) {
        prefix = '';
    } else {
        prefix = pathPrefix;
    }

    try {
        languageFile = fs.loadJSON(prefix + "lang/" + self.defaultLang + ".json");
    } catch (e) {            
        try {
            languageFile = fs.loadJSON(prefix + "lang/en.json");
        } catch (e) {
            languageFile = null;
        }
    }

    return languageFile;
};

AutomationController.prototype.loadModuleMedia = function(moduleName,fileName) {
    var img = ["png","jpg","jpeg","JPG","JPEG","gif"],
        text = ["css","htm","html","shtml","js","txt","rtf","xml"],
        video = ["mpeg","mpg","mpe","qt","mov","viv","vivo","avi","movie","mp4"],
        fe,
        resObject = {
            data: null,
            ct: null
        };

    try {
        
        fe = fileName.split(".").pop();

        if(img.indexOf(fe) > -1){
            resObject.ct = "image/(png|jpeg|gif)";
        }
        
        if(text.indexOf(fe) > -1){
            resObject.ct = "text/(css|html|javascript|plain|rtf|xml)";
        }

        if(video.indexOf(fe) > -1){
            resObject.ct = "video/(mpeg|quicktime|vnd.vivo|x-msvideo|x-sgi-movie|mp4)";
        }
    
        try{
            resObject.data = fs.load('userModules/' + moduleName + '/htdocs/' + fileName);
        } catch(e){
            resObject.data = fs.load('modules/' + moduleName + '/htdocs/' + fileName);
        }

    }catch(e){
        resObject = null;
    }
    
    return resObject;
};

AutomationController.prototype.loadImage = function(fileName) {
    var data = null,
        img = loadObject(fileName);

        if (!!img) {
            data = Base64.decode(img);
        }       
        
        return data;
};

AutomationController.prototype.hashCode = function(str) {
    var hash = 0, i, chr, len;
    if (this.length === 0) {
        return hash;
    }
    for (i = 0, len = str.length; i < len; i++) {
        chr   = str.charCodeAt(i);
        hash  = ((hash << 5) - hash) + chr;
        hash  = hash & hash; // Convert to 32bit integer
    }
    return hash;
};
