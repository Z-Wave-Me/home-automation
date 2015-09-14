/*** AeonMultiSensor Z-Way Home Automation module *************************************

 Version: 1.0.0
 (c) Z-Wave.Me, 2015

 -----------------------------------------------------------------------------
 Author: James Millar <islipfd19@gmail.com>
 
 Many thanks to Yurkin Vitaliy <aivs@z-wave.me> as his SmartLight module was the basis to this one.
 Description: In the daytime the light turns on for 100% if luminescence is below desired value, at 
 night the light turns on for your desired value.
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------
function AeonMultiSensor (id, controller) {
    // Call superconstructor first (AutomationModule)
    AeonMultiSensor.super_.call(this, id, controller);
};

inherits(AeonMultiSensor, AutomationModule);
_module = AeonMultiSensor;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------
AeonMultiSensor.prototype.init = function (config) {
    // Call superclass' init (this will process config argument and so on)
    AeonMultiSensor.super_.prototype.init.call(this, config);

    var self = this;

    // Day start
    var time_07_00_arr = this.config.Day.DayTimeStart.split(":").map(function(x) { return parseInt(x, 10); });
    this.Time_07_00 = time_07_00_arr[0] * 60 + time_07_00_arr[1];

    // Day end
    var time_23_59_arr = this.config.Day.DayTimeEnd.split(":").map(function(x) { return parseInt(x, 10); });
    this.Time_23_59 = time_23_59_arr[0] * 60 + time_23_59_arr[1];

    // handler for Sensor
    this.sensorTriggered = function (Sensor) {
        // Now Time in minutes
        var nowDate = new Date();
        var nowTime = nowDate.getHours() * 60 + nowDate.getMinutes();
        var level = self.config.Level;

        try {
            // Check Motion Sensor
            if ((Sensor.get("metrics:level") == "on") && (LuxKey === 1)) {
                if (nowTime >= self.Time_07_00 && nowTime <= self.Time_23_59) {
                    self.controller.devices.get(self.config.Dimmer).performCommand("exact", { level: 99 });
                    self.controller.devices.get(self.config.Dimmer).performCommand("exact", { level: 255 });
                }
                // At night the light turns on at desired level.
                else {
                    self.controller.devices.get(self.config.Dimmer).performCommand("exact", { level: level });
                }
            }
            if ((Sensor.get("metrics:level") == "off")) {
                self.controller.devices.get(self.config.Dimmer).performCommand("exact", { level: 0 });
            }
        } catch (e) {
            LuxKey = null;
        }
    };

    // handler for Humidity 
    this.humidityLevelChanged = function (Humidity) {
        var humLowValue = self.config.Humidity.HumValueLow;
        var humHighValue = self.config.Humidity.HumValueHigh;
        try {
            if ((Humidity.get("metrics:level") <= humLowValue ) && ( humLowValue !== -1 ) && ( HumKey === 1 )) {
                self.controller.devices.get(self.config.Humidity.Switch).performCommand("off");
                HumKey = 0; // Added a key here so that the device can be manually turned on without fear of it auto turning off when the humidity conditions are met.
            } else if ((Humidity.get("metrics:level") >= humHighValue ) && ( humHighValue !== -1 )) {
                self.controller.devices.get(self.config.Humidity.Switch).performCommand("on");
                HumKey = 1;
            }
        } catch (e) {
            HumKey = null;
        }

    };

    // handler for Luminosity 
    this.luminosityLevelChanged = function (Luminosity) {
        var luxValue = self.config.Luminosity.LuxValue;
        if ((Luminosity.get("metrics:level") <= luxValue ) || ( luxValue === -1 )) {
            LuxKey = 1;
        } else if (Luminosity.get("metrics:level") >= luxValue ) {
            LuxKey = 0;
        }
    };

    // Setup metric update event listener
    this.controller.devices.on(this.config.MotionSensor, 'change:metrics:level', this.sensorTriggered);

    if (typeof this.config.Luminosity.LuminositySensor !== 'undefined') {
        this.controller.devices.on(this.config.Luminosity.LuminositySensor, 'change:metrics:level', this.luminosityLevelChanged);
    }

    if (typeof this.config.Humidity.HumiditySensor !== 'undefined') {
        this.controller.devices.on(this.config.Humidity.HumiditySensor, 'change:metrics:level', this.humidityLevelChanged);
    }
};

AeonMultiSensor.prototype.stop = function () {
    AeonMultiSensor.super_.prototype.stop.call(this);

    this.controller.devices.off(this.config.MotionSensor, 'change:metrics:level', this.sensorTriggered);

    if (typeof this.config.Luminosity.LuminositySensor !== 'undefined') {
        this.controller.devices.off(this.config.Luminosity.LuminositySensor, 'change:metrics:level', this.luminosityLevelChanged);
    }


    if (typeof this.config.Humidity.HumiditySensor !== 'undefined') {
        this.controller.devices.off(this.config.Humidity.HumiditySensor, 'change:metrics:level', this.humidityLevelChanged);
    }

    // Clear variables
    LuxKey = null;
    HumKey = null;
};
