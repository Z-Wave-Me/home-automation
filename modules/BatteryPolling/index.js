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
        self.controller.devices.filter(function (el) {
            return el.get("deviceType") === "battery";
        }).map(function(el) {
            el.performCommand("update");
        });
    };

    // create vDev
    this.vDev = this.controller.devices.create("BatteryPolling_" + this.id, {
        deviceType: "battery",
        metrics: {
            probeTitle: "Battery",
            scaleTitle: "%",
            level: "",
            icon: "",
            title: "Battery digest " + this.id
        }
    }, this.onPoll);

    this.onMetricUpdated = function (vDev) {
        if (!vDev || vDev.id === self.vDev.id) {
            return; // prevent infinite loop with updates from itself and allows first fake update
        }
        
        self.vDev.set("metrics:level", self.minimalBatteryValue());
        if (vDev.get("metrics:level") <= self.config.warningLevel) {
            self.controller.addNotification("warning", "Device " + vDev.get("metrics:title") + " is low battery", "battery");
        }
    };
    
    // Setup event listeners
    this.controller.devices.filter(function (el) {
        return el.get("deviceType") === "battery";
    }).map(function(el) {
        el.on("change:metrics:level", self.onMetricUpdated);
    });

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
    
    // run first time to set up the value
    this.onMetricUpdated();
};

BatteryPolling.prototype.stop = function () {
    BatteryPolling.super_.prototype.stop.call(this);

    var self = this;
    
    this.controller.devices.remove(this.vDev.id);
    this.controller.devices.filter(function (el) {
        return el.get("deviceType") === "battery";
    }).map(function(el) {
        el.off("change:metrics:level", self.onMetricUpdated);
    });
    this.controller.emit("cron.removeTask", "batteryPolling.poll");
    this.controller.off("batteryPolling.poll", this.onPoll);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

BatteryPolling.prototype.minimalBatteryValue = function () {
    var self = this,
        arr;
   
    arr = this.controller.devices.filter(function(vDev) {
        return vDev.get("deviceType") === "battery" && vDev.id != self.vDev.id;
    }).map(function(vDev) {
        return vDev.get("metrics:level");
    });
    arr.push(100);

    return Math.min.apply(null, arr);
}
