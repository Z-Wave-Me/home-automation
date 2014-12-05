/*** SmartLight Z-Way Home Automation module *************************************

 Version: 1.0.0
 (c) Z-Wave.Me, 2014

 -----------------------------------------------------------------------------
 Author: Yurkin Vitaliy <aivs@z-wave.me>
 Description: In the daytime the light turns on for 100%, at night the light turns on for 20%.
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------
function SmartLight (id, controller) {
    // Call superconstructor first (AutomationModule)
    SmartLight.super_.call(this, id, controller);

    // by default dimmer button status not pressed
    this.dimmerButtonStatus = 0;

    // Sensor Enable or Disable
    this.sensorEnable = 1;

    this.timerSmartLight = null;
};

inherits(SmartLight, AutomationModule);
_module = SmartLight;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------
SmartLight.prototype.init = function (config) {
    // Call superclass' init (this will process config argument and so on)
    SmartLight.super_.prototype.init.call(this, config);

    var self = this;

    // Virtual device name you can find on http://localhost:8083/ZAutomation/api/v1/devices
    this.Sensor = this.controller.devices.get(this.config.MotionSensor);
    this.Dimmer = this.controller.devices.get(this.config.Dimmer);
    this.DimmerButton = this.controller.devices.get(this.config.DimmerButton);

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

        // Check Motion Sensor
        if ((Sensor.get("metrics:level") == "on") && self.sensorEnable === 1) {

            // In the daytime or the dimmer Button pressed the light turns on for 100%  
            if ((nowTime >= self.Time_07_00 && nowTime <= self.Time_23_59) || self.dimmerButtonStatus === 1) {
                self.Dimmer.performCommand("exact", { level: 99 });
                self.Dimmer.performCommand("exact", { level: 255 });
            }
            // At night the light turns on for 20%
            else {
                self.Dimmer.performCommand("exact", { level: 20 });
                self.Dimmer.performCommand("exact", { level: 255 });
            }
        }
    };

    // handler for Dimmer Light 
    this.dimmerLevelChanged = function (Dimmer) {
        // when light off, dimmer button status not pressed
        if (Dimmer.get("metrics:level") === 0) {
            self.dimmerButtonStatus = 0;
        }
    };

    // handler for Dimmer Button
    this.dimmerButtonPressed = function (DimmerButton) {
        // if pressed up, turn on the light
        if (DimmerButton.get("metrics:level")=== "on") {
            self.Dimmer.performCommand("exact", { level: 99 });
            self.Dimmer.performCommand("exact", { level: 255 });
            self.dimmerButtonStatus = 1; 
            if (self.timerSmartLight) {
                // Timer is set, so we destroy it
                clearTimeout(self.timerSmartLight);
            }
            self.sensorEnable = 1;
        } 
        // if pressed down, turn off the light and does not respond to the sensor one minute
        else if (DimmerButton.get("metrics:level")=== "off") {
            self.Dimmer.performCommand("exact", { level: 0 });
            self.sensorEnable = 0;


            if (self.timerSmartLight) {
            // Timer is set, so we destroy it
            clearTimeout(self.timerSmartLight);
            }

            // pressed down, set (or reset) timer to new timeout
            self.timerSmartLight = setTimeout(function () {
                self.sensorEnable = 1;
                // And clearing out this.timer variable
                self.timerSmartLight = null;
            }, 60*1000);
        } 
    };

    // Setup metric update event listener
    this.Sensor.on('change:metrics:level', this.sensorTriggered);
    this.Dimmer.on('change:metrics:level', this.dimmerLevelChanged);
    // Check if Dimmer Button exist
    if (typeof self.DimmerButton != 'undefined') {
        this.DimmerButton.on('change:metrics:level', this.dimmerButtonPressed);
    }
};

SmartLight.prototype.stop = function () {
    SmartLight.super_.prototype.stop.call(this);

    if (this.sensorTriggered && this.Sensor)
        this.Sensor.off('change:metrics:level', this.sensorTriggered);

    if (this.timerSmartLight)
        clearInterval(this.timerSmartLight);
};
