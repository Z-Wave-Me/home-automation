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
    this.controller.registerDevice(this.vdev);

    this.batIds = this.scanForBatteries();

    this.controller.registerWidgetClass({
        className: "BatteryStatusWidget",
        code: "BatteryPolling/batteryStatus.js",
        mainUI: "BatteryPolling/batteryStatus.html"
    });

    self.vdev.setMetricValue("reports", self.transformToReports());

    this.controller.emit("cron.addTask", "batteryPolling.poll", {
        minute: 0,
        hour: 0,
        weekDay: this.config.launchWeekDay,
        day: null,
        month: null
    });

    // Setup event listeners
    this.controller.on('device.metricUpdated', function (vdevId, name, value) {
        var pos = self.batIds.indexOf(vdevId);
        if (pos > -1 && name === "level") {
            self.vdev.setMetricValue("reports", self.transformToReports());
        }
    });

    // TODO: Refactor to device.update command
    this.controller.on('batteryPolling.poll', function () {
        self.vdev.performCommand("update");
    });
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

BatteryPolling.prototype.scanForBatteries = function () {
    var self = this;
    return Object.keys(this.controller.devices).filter(function (vdevId) {
        var vdev = self.controller.devices[vdevId];
        return vdev.deviceType === "probe" && vdev.deviceSubType === "battery";
    }).map(function (item) {
        return item;
    });
}

// BatteryPolling.prototype.collectLevels = function () {
//     var self = this;
//     this.batIds.forEach(function (vdevId) {
//         self.batLevels[vdevId] = self.controller.devices[vdevId].getMetricValue("level");
//     });
// }

BatteryPolling.prototype.transformToReports = function () {
    var self = this;
    var res = [];

    this.batIds.forEach(function (vdevId) {
        var vdev = self.controller.devices[vdevId];
        res.push({
            id: vdevId,
            level: vdev.getMetricValue("level"),
            title: vdev.getMetricValue("title")
        })
    });

    return res;
}
