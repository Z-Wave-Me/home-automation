/*** ThermostatRules Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: James Millar <islipfd19@gmail.com>
Description:
    This module will allow you to set the mode of your thermostat depending
    on the time of year

    Change Log:
    version - 1.0.0 initial version
    version - 1.0.1 added freezing point temp. Uses the difference between
               the users target temp and the freezing temp to determine
               if heat mode should be set.

    To-Do - 1. Add array functionality to json file so that one would only 
               have to add on module instance instead of multiple module 
               instances for each setting.
            2. Add functionality to for cron to trigger at specific times
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

function ThermostatRules (id, controller) {
    // Call superconstructor first (AutomationModule)
    ThermostatRules.super_.call(this, id, controller);
}

inherits(ThermostatRules, AutomationModule);

_module = ThermostatRules;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

ThermostatRules.prototype.init = function (config) {
    ThermostatRules.super_.prototype.init.call(this, config);

    var self = this;

    dev = config.device;
    month = this.config.month;
    var units = this.config.units;
    mode = this.config.mode;
    var city = this.config.city;
    var country = this.config.country;

    if (mode === "0") {
        temp = null;
    } else {
        temp = this.config.testTemp.temp;
    }
    outdoor_temp = null;

    mo = new Date();
    curMonth = Math.round(mo.getMonth() + 1); // We add 1 because months start at 0 here.

    if (units === "celsius") {
        freeze = 0;
    } else {
        freeze = 32;
    }

    console.log("INFO ThermostatRules: dev " + dev);
    console.log("INFO ThermostatRules: month " + month);
    console.log("INFO ThermostatRules: units " + units);
    console.log("INFO ThermostatRules: mode " + mode);
    console.log("INFO ThermostatRules: city " + city);
    console.log("INFO ThermostatRules: country " + country);
    console.log("INFO ThermostatRules: temp " + temp);
    console.log("INFO ThermostatRules: curMonth " + curMonth);
    console.log("INFO ThermostatRules: Date " + mo);

    var pt = 720; // Configured to set thermostat mode twice a day.
    var mt = (pt < 60) ? [0, 59, pt] : 0;
    var ht = pt >= 24*60 ? 0 : (pt/60 >=1 ? [0, 23, Math.round(pt/60)] : null);
    var wdt = pt/24/60 >=1 ? [0, 6, Math.round(pt/24/60)] : null;

    var p = 720; // Configured to check current temp twice a day.
    var m = (p < 60) ? [0, 59, p] : 0;
    var h = p >= 24*60 ? 0 : (p/60 >=1 ? [0, 23, Math.round(p/60)] : null);
    var wd = p/24/60 >=1 ? [0, 6, Math.round(p/24/60)] : null;

    console.log("INFO ThermostatRules: m = " + m);
    console.log("INFO ThermostatRules: h = " + h);
    console.log("INFO ThermostatRules: p = " + p);

    this.fetchOutsideTemp = function() {
        http.request({
            url: "http://api.openweathermap.org/data/2.5/weather?q=" + city + "," + country,
            async: true,
            success: function(res) {
                try {
                    outdoor_temp = Math.round(units === "celsius" ? res.data.main.temp - 273.15 : (res.data.main.temp - 273.15) * 1.8 + 32);
                    console.log("INFO ThermostatRules: outdoor_temp " + outdoor_temp); 
                } catch (e) {
                    console.log("INFO ThermostatRules: Cannot get current outside temperature!");
                    outdoor_temp = null;
                }
            }
        });
    };

    this.thermoMode = function() {
    var self = this;
        console.log("INFO ThermostatRules: outdoor_temp " + outdoor_temp);

        outdoor_temp = Math.round(outdoor_temp);
        temp = Math.round(temp);

        var _curThermMode;
        _curThermMode = zway.devices[dev].instances[0].commandClasses[0x40].data.mode.value;
        console.log("INFO ThermostatRules: _curThermMode " + _curThermMode);

        if ((mode === "1") && ( _curThermMode != "1" )) {
            if (month === curMonth) {
                if (outdoor_temp <= (Math.round(temp - freeze))) {
                    zway.devices[dev].instances[0].commandClasses[0x40].Set(mode);
                    console.log("INFO ThermostatRules: Thermostat is in Heat mode!");
                } else {
                    console.log("INFO ThermostatRules: Outside temp is greater than indoor temp!");
                }
            }
        } else if ((mode === "2") && ( _curThermMode != "2" )) {
            if (month === curMonth) {
                if (outdoor_temp > temp) {
                    zway.devices[dev].instances[0].commandClasses[0x40].Set(mode);
                    console.log("INFO ThermostatRules: Thermostat is in Cool mode!");
                } else {
                    console.log("INFO ThermostatRules: Outside temp is lower than inside temp!");
                }
            }
        } else if ((mode === "0") && ( _curThermMode != "0" )) {
            zway.devices[dev].instances[0].commandClasses[0x40].Set(mode);
            console.log("INFO ThermostatRules: Thermostat mode is Off");
        } else if ((mode === "3") && ( _curThermMode != "3" )) {
            zway.devices[dev].instances[0].commandClasses[0x40].Set(mode);
            console.log("INFO ThermostatRules: Thermostat mode is Auto"); 
        } else {
            console.log("INFO ThermostatRules: Entered paramters don't meet criteria!");
        }
    };

    self.fetchOutsideTemp(self);

    this.onOutsideTemp = function() {
        self.fetchOutsideTemp(self);
    };

    this.onthermMode = function() {
        self.thermoMode(self);
    };

    this.controller.on('thermMode.poll', this.onthermMode);

    this.controller.emit("cron.addTask", "thermMode.poll", {
        minute: mt,
        hour: ht,
        weekDay: null,
        day: null,
        month: null
    });

    this.controller.on('OutsideTemp.poll', this.onOutsideTemp);

    this.controller.emit("cron.addTask", "OutsideTemp.poll", {
        minute: m,
        hour: h,
        weekDay: null,
        day: null,
        month: null
    });
};


ThermostatRules.prototype.stop = function () {
    ThermostatRules.super_.prototype.stop.call(this);

    this.controller.emit("cron.removeTask", "OutsideTemp.poll");
    this.controller.off("OutsideTemp.poll", this.onOutsideTemp);

    this.controller.emit("cron.removeTask", "thermMode.poll");
    this.controller.off("thermMode.poll", this.onthermMode);


    var self = null;
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

// There are not module methods.
