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
    var result = {};

    var self = this;
    if (this.meta.hasOwnProperty("defaults") && "object" === typeof this.meta.defaults) {
        Object.keys(this.meta.defaults).forEach(function (key) {
            result[key] = self.meta.defaults[key];
        });
    }

    if (!!config) {
        Object.keys(config).forEach(function (key) {
            result[key] = config[key];
        });
    }

    return result;
}

AutomationModule.prototype.init = function (config) {
    console.log("--- Starting module " + this.meta.defaults.title);
    if (!!config) {
        this.config = this.defaultConfig(config);
        this.saveConfig();
    } else {
        this.loadConfig();
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
    };
};

AutomationModule.prototype.saveConfig = function () {
    saveObject("cfg" + this.id, this.config);
};

// This method returns JSON representation
AutomationModule.prototype.toJSON = function () {
    function getClassName(obj) {
        if (typeof obj != "object" || obj === null) return false;
        return /(\w+)\(/.exec(obj.constructor.toString())[1];
    };

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
        var filePath = this.moduleBasePath() + "/module.json";
        this.meta = loadJSON(filePath);
    }
    return this.meta;
};
