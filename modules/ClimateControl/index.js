/*** ClimateControl Z-Way HA module *******************************************

Version: 1.0.1
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: James Millar <islipfd19@gmail.com>
Description:
    This module will allow you to set the mode of your thermostat depending
    on the time of year

    Change Log:
    version - 1.0.0 initial version (ThermostatRules)
              1.0.1 a. added the ability to provide multiple schedules in one rule.
                    b. renamed module from ThermostatRules to ClimateControl.
					
    To-Do - 1. Add functionality to for cron to trigger at specific times
               of the day. Currently configured to check twice a day.

    Key: Thermostat modes:
         0 = off
         1 = heat
         2 = cool
         3 = auto

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function ClimateControl (id, controller) {
    // Call superconstructor first (AutomationModule)
    ClimateControl.super_.call(this, id, controller);
}

inherits(ClimateControl, AutomationModule);

_module = ClimateControl;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

ClimateControl.prototype.init = function (config) {
    ClimateControl.super_.prototype.init.call(this, config);

    var self = this;

    city = this.config.city;
    country = this.config.country;
    dev = config.device;
    units = this.config.units;

    tree = this.config;

this.sensors = function() {
    tree.controls.forEach(function(value){
        month = value.month;
        mode = value.mode;

        if (mode === "0") {
            temp = null;
        } else {
            temp = value.testTemp;
        }

        // Convert the thermostat modes true values
        if (mode === "Off") {
            mode = "0";
        } else if (mode === "Heat") {
            mode = "1";
        } else if (mode === "Cool") {
            mode = "2";
        } else if (mode === "Auto") {
            mode = "3";
        } else {
            mode = null;
        }

        outdoor_temp = null;

        mo = new Date();
        curMonth = Math.round(mo.getMonth() + 1); // We add 1 because months start at 0 here.

        console.log("INFO ClimateControl: city " + city);
        console.log("INFO ClimateControl: country " + country);
        console.log("INFO ClimateControl: dev " + dev);
        console.log("INFO ClimateControl: units " + units);

        console.log("INFO ClimateControl: month " + month);
        console.log("INFO ClimateControl: mode " + mode);
        console.log("INFO ClimateControl: temp " + temp);

        console.log("INFO ClimateControl: curMonth " + curMonth);
        console.log("INFO ClimateControl: Date " + mo);
    });
};
    self.sensors(self);

    var pt = 720; // Configured to set thermostat mode twice a day.
    var mt = (pt < 60) ? [0, 59, pt] : 0;
    var ht = pt >= 24*60 ? 0 : (pt/60 >=1 ? [0, 23, Math.round(pt/60)] : null);
    var wdt = pt/24/60 >=1 ? [0, 6, Math.round(pt/24/60)] : null;

    var p = 720; // Configured to check current temp twice a day.
    var m = (p < 60) ? [0, 59, p] : 0;
    var h = p >= 24*60 ? 0 : (p/60 >=1 ? [0, 23, Math.round(p/60)] : null);
    var wd = p/24/60 >=1 ? [0, 6, Math.round(p/24/60)] : null;

    console.log("INFO ClimateControl: m = " + m);
    console.log("INFO ClimateControl: h = " + h);
    console.log("INFO ClimateControl: p = " + p);

    this.ClifetchOutsideTemp = function() {
        http.request({
            url: "http://api.openweathermap.org/data/2.5/weather?q=" + city + "," + country,
            async: true,
            success: function(res) {
                try {
                    outdoor_temp = Math.round(units === "celsius" ? res.data.main.temp - 273.15 : (res.data.main.temp - 273.15) * 1.8 + 32);
                    console.log("INFO ClimateControl: outdoor_temp " + outdoor_temp); 
                } catch (e) {
                    console.log("INFO ClimateControl: Cannot get current outside temperature!");
                    outdoor_temp = null;
                }
            }
        });
    };

    this.ClithermoMode = function() {
    var self = this;
        console.log("INFO ClimateControl: outdoor_temp " + outdoor_temp);

        outdoor_temp = Math.round(outdoor_temp);
        temp = Math.round(temp);

        var _curThermMode;
        _curThermMode = zway.devices[dev].instances[0].commandClasses[0x40].data.mode.value;
        console.log("INFO ClimateControl: _curThermMode " + _curThermMode);

        if ((mode === "1") && ( _curThermMode != "1" )) {
            if (month === curMonth) {
                if (outdoor_temp < temp) {
                    zway.devices[dev].instances[0].commandClasses[0x40].Set(mode);
                    console.log("INFO ClimateControl: Thermostat is in Heat mode!");
                } else {
                    console.log("INFO ClimateControl: Outside temp is greater than indoor temp!");
                }
            }
        } else if ((mode === "2") && ( _curThermMode != "2" )) {
            if (month === curMonth) {
                if (outdoor_temp > temp) {
                    zway.devices[dev].instances[0].commandClasses[0x40].Set(mode);
                    console.log("INFO ClimateControl: Thermostat is in Cool mode!");
                } else {
                    console.log("INFO ClimateControl: Outside temp is lower than inside temp!");
                }
            }
        } else if ((mode === "0") && ( _curThermMode != "0" )) {
            zway.devices[dev].instances[0].commandClasses[0x40].Set(mode);
            console.log("INFO ClimateControl: Thermostat mode is Off");
        } else if ((mode === "3") && ( _curThermMode != "3" )) {
            zway.devices[dev].instances[0].commandClasses[0x40].Set(mode);
            console.log("INFO ClimateControl: Thermostat mode is Auto"); 
        } else {
            console.log("INFO ClimateControl: Entered paramters don't meet criteria!");
        }
    };

    self.ClifetchOutsideTemp(self);

    this.onCliOutsideTemp = function() {
        self.ClifetchOutsideTemp(self);
    };

    this.onClithermMode = function() {
        self.ClithermoMode(self);
    };

    this.controller.on('ClithermMode.poll', this.onClithermMode);

    this.controller.emit("cron.addTask", "ClithermMode.poll", {
        minute: mt,
        hour: ht,
        weekDay: null,
        day: null,
        month: null
    });

    this.controller.on('CliOutsideTemp.poll', this.onCliOutsideTemp);

    this.controller.emit("cron.addTask", "CliOutsideTemp.poll", {
        minute: m,
        hour: h,
        weekDay: null,
        day: null,
        month: null
    });
};


ClimateControl.prototype.stop = function () {
    ClimateControl.super_.prototype.stop.call(this);

    this.controller.emit("cron.removeTask", "CliOutsideTemp.poll");
    this.controller.off("CliOutsideTemp.poll", this.onCliOutsideTemp);

    this.controller.emit("cron.removeTask", "ClithermMode.poll");
    this.controller.off("ClithermMode.poll", this.onClithermMode);


    var self = null;
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

// There are no module methods.
