/*** BatteryPolling Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2013
-----------------------------------------------------------------------------
Author: Gregory Sitnin <sitnin@z-wave.me>
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

    executeFile(this.moduleBasePath()+"/BatteryPollingDevice.js");
    this.vdev = new BatteryPollingDevice("BatteryPolling", this.controller);
    this.vdev.setMetricValue("level", self.minimalBatteryValue());
    this.vdev.init();
    this.controller.registerDevice(this.vdev);


    this.controller.emit("cron.addTask", "batteryPolling.poll", {
        minute: 0,
        hour: 0,
        weekDay: this.config.launchWeekDay,
        day: null,
        month: null
    });

    // Setup event listeners
    this.onMetricUpdated = function (vdevId, name, value) {
        var dev = self.controller.findVirtualDeviceById(vdevId);
        if (dev && dev.deviceType === "battery" && name === "level") {
            self.vdev.setMetricValue("level", self.minimalBatteryValue());
            if (value <= self.config.warningLevel)
                self.controller.addNotification("warning", "Device " + dev.getMetricValue("title") + " is low battery", "battery");
        }
    };
    this.controller.on('device.metricUpdated', this.onMetricUpdated);

    // TODO: Refactor to device.update command
    this.onPoll = function () {
        self.vdev.performCommand("update");
    };
    this.controller.on('batteryPolling.poll', this.onPoll);
};

BatteryPolling.prototype.stop = function () {
    BatteryPolling.super_.prototype.stop.call(this);

    this.controller.removeDevice(this.vdev.id);
    this.controller.off('device.metricUpdated', this.onMetricUpdated);
    this.controller.off('batteryPolling.poll', this.onPoll);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

BatteryPolling.prototype.minimalBatteryValue = function () {
    var self = this;
    var res = 100;

    for (var vdevId in this.controller.devices) {
        var vdev = self.controller.devices[vdevId];
        if (vdev.deviceType === "battery" && res > vdev.getMetricValue("level"))
            res = vdev.getMetricValue("level");
    }

    return res;
}
