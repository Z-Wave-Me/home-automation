// Module dependencies

var util = require("util");
var path = require("path");
var AutomationModule = require("../../classes/AutomationModule");

// Module inheritance and setup

function RemoteControl (id, controller, config) {
    RemoteControl.super_.call(this, id, controller, config);
}

util.inherits(RemoteControl, AutomationModule);

module.exports = exports = RemoteControl;

RemoteControl.prototype.init = function (config) {
    RemoteControl.super_.prototype.init.call(this, config);

    this.controller.registerDevice(this.config.deviceId, this);

    var self = this;

    this.controller.on('zway.update', function (dataPoint, value) {
        self.onUpdate(dataPoint, value);
    });
};

RemoteControl.prototype.getModuleBasePath = function () {
    return path.resolve(__dirname);
};

RemoteControl.prototype.getModuleInstanceMetrics = function () {
    return this.metrics;
};

// Module methods

RemoteControl.prototype.onUpdate = function (dataPoint, value) {
    var deviceDataPoint = util.format("devices.%d", this.config.zwayDeviceId);
    var triggeredButton = null;

    // console.log("dataPoint, value:", dataPoint, value);

    if (deviceDataPoint + ".instances.1.commandClasses.32.data.level" === dataPoint && 255 === value.value) {
        triggeredButton = 0;
    } else if (deviceDataPoint + ".instances.3.commandClasses.32.data.level" === dataPoint && 255 === value.value) {
        triggeredButton = 1;
    } else if (deviceDataPoint + ".instances.1.commandClasses.32.data.level" === dataPoint && 0 === value.value) {
        triggeredButton = 2;
    } else if (deviceDataPoint + ".instances.3.commandClasses.32.data.level" === dataPoint && 0 === value.value) {
        triggeredButton = 3;
    }

    if (triggeredButton!==null) {
        this.controller.emit("remote.buttonClick", this.config.deviceId, triggeredButton);
        console.log("remote.buttonClick", this.config.deviceId, triggeredButton+1);
    }
};
