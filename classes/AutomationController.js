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
    this.availableLang = ['en', 'ru', 'de'];
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
    var self = this,
        oldLang = self.defaultLang;

    self.defaultLang = self.availableLang.indexOf(lang) === -1 ? 'en' : lang;
    
    if(self.defaultLang !== oldLang) {
        this.emit('language.changed', self.defaultLang);
    }
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

    try {
        saveObject("config.json", cfgObject);
    } catch(e) {
        console.log("Error: can not write back config to storage: ", e);
    }
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

AutomationController.prototype.listInstances = function (){
    var self = this,
        expInstances = [];

    if(self.instances) {
        self.instances.forEach(function (instance){
            var moduleJSON = self.getModuleData(instance.moduleId);

            expInstances.push(_.extend(instance, {
                state : moduleJSON.state || null,
                module : moduleJSON.defaults.title || null,
                title : !instance.title || instance.title === ''? moduleJSON.defaults.title : instance.title
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
    var langFile = this.loadMainLang(),
        values;

    try {
        instance.stop();
        delete this.registerInstances[instance.id];
    } catch (e) {
        values = ((instance && instance.id) ? instance.id : "<unknow id>") + ": " + e.toString();

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
    var register_instance = this.registerInstances[id],
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
};

AutomationController.prototype.getVdevInfo = function (id) {
    return this.vdevInfo[id] || {};
};

AutomationController.prototype.setVdevInfo = function (id, device) {
    this.vdevInfo[id] = _.pick(device, "deviceType", "metrics", "location", "tags", "permanently_hidden");
    this.saveConfig();
    return this.vdevInfo[id];
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
    var self = this;
    var locations = this.locations.filter(function (location) {
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
        this.emit('core.error', new Error("Cannot remove location " + id + " - doesn't exist"));
    }
};

AutomationController.prototype.updateLocation = function (id, title, user_img, default_img, img_type, callback) {
    var locations = this.locations.filter(function (location) {
        return location.id === id;
    });
    if (locations.length > 0) {
        this.locations[this.locations.indexOf(locations[0])].title = title;
        if (typeof user_img === 'string' && user_img.length > 0) {
            this.locations[this.locations.indexOf(locations[0])].user_img = user_img;
        }
        if (typeof default_img === 'string' && default_img.length > 0) {
            this.locations[this.locations.indexOf(locations[0])].default_img = default_img;
        }
        if (typeof img_type === 'string' && img_type.length > 0) {
            this.locations[this.locations.indexOf(locations[0])].img_type = img_type;
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
            
            l = 0,
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
        
        if (object.hasOwnProperty('password')) {
            this.profiles[index].password = object.password;
        }
        if (object.hasOwnProperty('login')) {
            this.profiles[index].login = object.login;
        }
    }

    _.defaults(this.profiles[index], {
        login: null,
        password: null
    });

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
        devices = that.devices.filter(function(device){
            if(device.get('permanently_hidden') === false){
                return device;
            }
        }),
        deviceTypes = _.uniq(_.map(devices, function (device) {
                return device.get('deviceType');
        }));

    that.namespaces = [];
    deviceTypes.forEach(function (type) {
        that.setNamespace('devices_' + type, devices.filter(function (device) {
                return device.get('deviceType') === type;
        }).map(function (device) {            
                return {deviceId: device.id, deviceName: device.get('metrics:title')};
        }));
    });
    that.setNamespace('devices_all', devices.filter(function (device){
            return device;
    }).map(function (device) {
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

AutomationController.prototype.getModuleData = function (moduleName) {
    var self = this,
        defaultLang = self.defaultLang,
        languageFile,
        data;
    
    try {
        metaStringify = JSON.stringify(self.modules[moduleName].meta);
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

    languageFile = self.loadModuleLang(moduleName);

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

// load module lang folder
AutomationController.prototype.loadModuleLang = function (moduleId) {
    var self = this,
        languageFile;

        languageFile = self.loadMainLang('modules/' + moduleId + '/');

        if(languageFile === null){
            languageFile = self.loadMainLang('userModules/' + moduleId + '/');
        }

    return languageFile;
};

// load lang folder with given prefix
AutomationController.prototype.loadMainLang = function (pathPrefix) {
    var self = this,
        languageFile,
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
    var data,
        img = loadObject(fileName);
        data = Base64.decode(img);
        
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
