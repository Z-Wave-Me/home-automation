/*** BatteryPolling Z-Way HA module *******************************************

Version: 2.0.0
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: Gregory Sitnin <sitnin@z-wave.me> nad Serguei Poltorak <ps@z-wave.me>
Description:
    This module periodically requests all batery devices for battery level report

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function BatteryPolling (id, controller) {
    // Call superconstructor first (AutomationModule)
    BatteryPolling.super_.call(this, id, controller);
}

inherits(BatteryPolling, AutomationModule);

_module = BatteryPolling;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

BatteryPolling.prototype.init = function (config) {
    BatteryPolling.super_.prototype.init.call(this, config);

    var self = this;

    // polling function
    this.onPoll = function () {
        for (var id in zway.devices) {
            zway.devices[id].Battery && zway.devices[id].Battery.Get();
        }
    };

    // create vDev
    this.vDev = this.controller.devices.create("BatteryPolling_" + this.id, {
        deviceType: "battery",
        metrics: {
            probeTitle: "Battery",
            scaleTitle: "%",
            level: "",
            icon: "",
            title: "Scene " + this.id
        }
    }, this.onPoll);

    this.onMetricUpdated = function (vdev) {
        self.vdev.setMetricValue("level", self.minimalBatteryValue());
        if (value <= self.config.warningLevel) {
            self.controller.addNotification("warning", "Device " + dev.get("metrics:title") + " is low battery", "battery");
        }
    };
    
    // Setup event listeners
    this.controller.devices.where({deviceType: "battery"}).on("change:metrics:level", this.onMetricUpdated);

    // set up cron handler
    this.controller.on("batteryPolling.poll", this.onPoll);

    // add cron schedule
    this.controller.emit("cron.addTask", "batteryPolling.poll", {
        minute: 0,
        hour: 0,
        weekDay: this.config.launchWeekDay,
        day: null,
        month: null
    }); 
};

BatteryPolling.prototype.stop = function () {
    BatteryPolling.super_.prototype.stop.call(this);

    this.controller.devices.remove(this.vDev.id);
    this.controller.devices.where({deviceType: "battery"}).off("change:metrics:level", this.onMetricUpdated);
    this.controller.emit("cron.removeTask", "batteryPolling.poll");
    this.controller.off("batteryPolling.poll", this.onPoll);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

BatteryPolling.prototype.minimalBatteryValue = function () {
    var self = this;
    var res = 100;

    for (var vdevId in this.controller.devices) {
        var vdev = self.controller.devices[vdevId];
        if (vdev.get("deviceType") === "battery" && res > vdev.get("metrics:level"))
            res = vdev.get("metrics:level");
    }

    return res;
}
