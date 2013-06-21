// Module dependencies

var util = require("util");
var path = require("path");
var AutomationModule = require("../../classes/AutomationModule");

// Module inheritance and setup

function PowerOutlet (id, controller) {
    PowerOutlet.super_.call(this, id, controller);
}

util.inherits(PowerOutlet, AutomationModule);

module.exports = exports = PowerOutlet;

PowerOutlet.prototype.init = function (config) {
    PowerOutlet.super_.prototype.init.call(this, config);

    this.metrics.state = null;

    this.controller.registerDevice(this.config.deviceId, this);

    this.controller.registerAction(this.id, {
        id: "toggle",
        deviceId: this.config.deviceId,
        args: null,
        reqs: null
    }, this.toggleAction);

    this.controller.registerWidget(this.config.deviceId+"Widget", {
        title: "Power outlet",
        type: "switch",
        iconResFormat: "bulb_{state}",
        actions: ["toggle"],
        metrics: {
            "state": {
                "type": "string",
                "enum": ['on', 'off']
            }
        }
    });

    var self = this;

    this.controller.on('zway.update', function (dataPoint, value) {
        self.onUpdate(dataPoint, value);
    });
};

PowerOutlet.prototype.getModuleBasePath = function () {
    return path.resolve(__dirname);
};

PowerOutlet.prototype.getModuleInstanceMetrics = function () {
    return this.metrics;
};

// Module methods

PowerOutlet.prototype.onUpdate = function (dataPoint, value) {
    var triggeredState = null;
    var devId = this.config.zwayDeviceId;
    var deviceDataPoint = util.format("devices.%d", devId);
    var myDataPoint = deviceDataPoint + ".instances.0.commandClasses.37.data.level";

    if (myDataPoint === dataPoint && 255 === value.value) {
        triggeredState = "on";
    } else if (myDataPoint === dataPoint && 0 === value.value) {
        triggeredState = "off";
    }

    if (triggeredState !== null) {
        this.metrics.state = triggeredState;
        this.controller.emit("deviceStateChanged", devId, triggeredState);
        this.controller.emit("powerOutlet.stateChanged", devId, triggeredState);
        console.log("--- powerOutlet.stateChanged", devId, triggeredState);
    }
};

PowerOutlet.prototype.setState = function (callback) {
    var zdevId = this.config.zwayDeviceId;
    var state = this.metrics.state;
    var myDataPoint = util.format("devices[%d].instances[0].commandClasses[37]", zdevId);
    var stateValue = "on" === state ? 255 : 0;

    this.controller.emit('zway.setDataPoint', {
        dataPoint: myDataPoint,
        value: stateValue
    })

    callback(null, {
        deviceId: this.config.deviceId,
        state: state
    });
};

PowerOutlet.prototype.toggleAction = function (args, callback) {
    console.log("Toggle Power Outlet action triggered");

    this.metrics.state = "on" === this.metrics.state ? "off" : "on";
    this.setState(callback);
};
