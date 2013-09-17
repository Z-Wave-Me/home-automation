/******************************************************************************

 BatteryPolling ZAutomation module
 Version: 1.0.0
 (c) ZWave.Me, 2013

 -----------------------------------------------------------------------------
 Author: Gregory Sitnin <sitnin@z-wave.me>
 Description:
     This module listens given VirtualDevice (which MUSt be typed as switch)
     level metric update events and switches off device after configured
     timeout if this device has been switched on.

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

/*
ZWaveBatteryLowLevelWarningWidget = function (id, controller, zDeviceId, zInstanceId) {
    ZWaveBatteryLowLevelWarningWidget.super_.call(this, id, controller, zDeviceId, zInstanceId);

    this.deviceType = "probe";

    var listBatteryLow = [];
    for (var id in zway.devices) {
        if (zway.devices[id].Battery) {
            if (zway.devices[id].Battery.data.level.value <= this.config.warningLevel) {
                listBatteryLow.push(id);
            }
        }
    }
    if (listBatteryLow.length) {
        this.setMetricValue("probeTitle", "Battery is empty in devices:" + listBatteryLow.toString());
    } else {
        this.setMetricValue("probeTitle", "Batteries are all OK");
    }
}

inherits(ZWaveBatteryEmptyWarningWidget, ZWaveDevice);

ZWaveBatteryEmptyWarningWidget.prototype.dataPoints = function () {
    return [this._dics().level];
}
*/

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

BatteryPolling.prototype.init = function (config) {
    // Call superclass' init (this will process config argument and so on)
    BatteryPolling.super_.prototype.init.call(this, config);
    
    this.controller.emit("cron.addTask", "batteryPolling.poll", {
        minute: 0,
        hour: 0,
        weekDay: this.config.launchWeekDay,
        day: null,
        month: null        
    });
    
    // Setup event listener
    this.controller.on('batteryPolling.poll', function () {
      for (var id in zway.devices) {
       zway.devices[id].Battery && zway.devices[id].Battery.Get();
      }
    });

    /*
    var widget = new ZWaveBatteryLowLevelWarningWidget("BatterLowLevelWidget", this.controller, 0, 0);
    widget.bindToDatapoints();
    this.controller.devices[widget.id] = widget;
    */
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

