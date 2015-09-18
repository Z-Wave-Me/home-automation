/*** Barometer Z-Way HA module *******************************************

Version: 1.0.1
(c) Z-Wave.Me, 2015
-----------------------------------------------------------------------------
Author: James Millar <islipfd19@gmail.com>
Description:
    Based on the OpenWeather module written by Serguei Poltorak
    This module creates the barometer widget

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function Barometer (id, controller) {
    // Call superconstructor first (AutomationModule)
    Barometer.super_.call(this, id, controller);
}

inherits(Barometer, AutomationModule);

_module = Barometer;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

Barometer.prototype.init = function (config) {
    Barometer.super_.prototype.init.call(this, config);

    var self = this;

    this.vDev = self.controller.devices.create({
        deviceId: "Barometer_" + this.id,
        defaults: {
            deviceType: "sensorMultiline",
            metrics: {
                probeTitle: 'Pressure'
            }
        },
        overlay: {
            metrics: {
                scaleTitle: this.config.units === "hPa" ? ' hPa' : ' inHg',
                title: this.config.city
            }
        },
        moduleId: this.id
    });

    this.timer = setInterval(function() {
        self.fetchExtendedBarometer(self);
    }, 3600*1000);
    self.fetchExtendedBarometer(self);
};

Barometer.prototype.stop = function () {
    Barometer.super_.prototype.stop.call(this);

    if (this.timer)
        clearInterval(this.timer);
        
    if (this.vDev) {
        this.controller.devices.remove(this.vDev.id);
        this.vDev = null;
    }
};


// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

Barometer.prototype.fetchExtendedBarometer = function(instance) {
    var self = instance,
        moduleName = "Barometer",
        langFile = self.controller.loadModuleLang(moduleName),
        lang = self.controller.defaultLang;

    http.request({
        url: "http://api.openweathermap.org/data/2.5/weather?q=" + encodeURIComponent(self.config.city) + "," + encodeURIComponent(self.config.country) +"&lang=" + lang,
        async: true,
        success: function(res) {
            try {
                var main = res.data.main,
                    pressure = res.data.pressure,
                    country = res.data.sys.country,
                    weatherData = {'main': main,'pressure': pressure},			
                    pressure = Math.round(self.config.units === "hPa" ? res.data.main.pressure : (res.data.main.pressure / 33.86389)),
                    icon = "http://www.conversion-website.com/utils/images/pressure.gif";
                    flag = "http://openweathermap.org/images/flags/" + country.toLowerCase() + ".png";

                self.vDev.set("metrics:zwaveOpenWeather", weatherData);
                self.vDev.set("metrics:level", pressure);
                self.vDev.set("metrics:icon", icon);
                self.vDev.set("metrics:country", country);
                self.vDev.set("metrics:flag", flag);
			} catch (e) {
                self.controller.addNotification("error", langFile.err_parse, "module");
            }
        },
        error: function() {
            self.controller.addNotification("error", langFile.err_fetch, "module");
        }
    });
};
