AutomationModule = function (id, controller) {
    var self = this;

    this.id = id;
    this.controller = controller;
    this.meta = this.getMeta();

    this.actions = {};
    this.actionFuncs = {};
    this.metrics = {};

    this.config = {};
    if (this.meta.hasOwnProperty('defaults')) {
        Object.keys(this.meta.defaults).forEach(function (key) {
            self.config[key] = self.meta.defaults[key];
        });
    }
};

AutomationModule.prototype.init = function (config) {
    var self = this;
    Object.keys(config).forEach(function (key) {
        self.config[key] = config[key];
    });
};

AutomationModule.prototype.runAction = function (actionId, args, callback) {
    // Run action function with actionId on instance if exists
    if (this.actionFuncs.hasOwnProperty(actionId)) {
        this.actionFuncs[actionId].call(this, args, callback);
    }
};

AutomationModule.prototype.getMeta = function () {
    if (!this.meta) {
        console.log("Loading module metadata", this);
        this.meta = loadJSON(this.moduleBasePath() + "/module.json");
    }

    return this.meta;
};

AutomationModule.prototype.moduleBasePath = function () {
    return global.confog.controller.modulesPath + "/AutomationModule";
}
