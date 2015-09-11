/*** Z-Way HA Automation module base class ************************************

Version: 1.0.0
-------------------------------------------------------------------------------
Author: Gregory Sitnin <sitnin@z-wave.me>
Copyright: (c) ZWave.Me, 2013

******************************************************************************/

AutomationModule = function (id, controller) {
    var self = this;

    this.id = id;
    this.controller = controller;
    this.meta = this.getMeta();

    this.actions = {};
    this.actionFuncs = {};
    this.metrics = {};

    this.config = {};
};

AutomationModule.prototype.defaultConfig = function (config) {
    var result = {},
        self = this;

    if (this.meta.hasOwnProperty("defaults") && _.isObject(this.meta.defaults)) {
        Object.keys(_.omit(this.meta.defaults, 'title', 'description')).forEach(function (key) {
            result[key] = self.meta.defaults[key];
        });
    }

    if (!!config) {
        Object.keys(config).forEach(function (key) {
            result[key] = config[key];
        });
    }

    return result;
};

AutomationModule.prototype.init = function (config) {
    console.log("--- Starting module " + this.meta.defaults.title);
    if (!!config) {
        this.saveNewConfig(config);
    } else {
        this.loadConfig();
    }
};

AutomationModule.prototype.saveNewConfig = function (config) {
    if (!!config) {
        this.config = this.defaultConfig(config);
        this.saveConfig();
    }
};

AutomationModule.prototype.stop = function () {
    console.log("--- Stopping module " + this.meta.defaults.title);
};

AutomationModule.prototype.loadConfig = function () {
    var self = this;
    var cfg = loadObject("cfg"+this.id);
    if ("object" === typeof cfg) {
        Object.keys(cfg).forEach(function (key) {
            self.config[key] = cfg[key];
        });
    }
};

AutomationModule.prototype.saveConfig = function (config) {
    var that = this,
        index = this.controller.instances.indexOf(_.find(this.controller.instances, function (model) { return model.id === that.id; }));

    this.controller.instances[index].params = config || this.config;
    this.controller.saveConfig();
};

// This method returns JSON representation
AutomationModule.prototype.toJSON = function () {
    function getClassName(obj) {
        if (typeof obj != "object" || obj === null) return false;
        return /(\w+)\(/.exec(obj.constructor.toString())[1];
    }

    return {
        module: getClassName(this),
        id: this.id,
        config: this.config
    };
};

AutomationModule.prototype.runAction = function (actionId, args, callback) {
    // Run action function with actionId on instance if exists
    if (this.actionFuncs.hasOwnProperty(actionId)) {
        this.actionFuncs[actionId].call(this, args, callback);
    }
};

AutomationModule.prototype.getMeta = function () {
    if (!this.meta) {
        this.meta =  this.controller.getModuleData(this.constructor.name);
        this.meta.id = this.constructor.name;
    }
    return this.meta;
};

AutomationModule.prototype.loadModuleJSON = function (filename) {
    return fs.loadJSON(this.meta.location + "/" + filename);
};
