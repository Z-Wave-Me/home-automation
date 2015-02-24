/*** OpenWeather Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: Serguei Poltorak <ps@z-wave.me>
Description:
    This module creates temperature widget

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function OpenWeather (id, controller) {
    // Call superconstructor first (AutomationModule)
    OpenWeather.super_.call(this, id, controller);
}

inherits(OpenWeather, AutomationModule);

_module = OpenWeather;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

OpenWeather.prototype.init = function (config) {
    OpenWeather.super_.prototype.init.call(this, config);

    var self = this;

    this.vDev = self.controller.devices.create({
        deviceId: "OpenWeather_" + this.id,
        defaults: {
            deviceType: "sensorMultilevel",
            metrics: {
                probeTitle: 'Temperature'
            }
        },
        overlay: {
            metrics: {
                scaleTitle: this.config.units === "celsius" ? '°C' : '°F',
                title: this.config.city
            }
        },
        moduleId: this.id
    });

    this.timer = setInterval(function() {
        self.fetchWeather(self);
    }, 3600*1000);
    self.fetchWeather(self);
};

OpenWeather.prototype.stop = function () {
    OpenWeather.super_.prototype.stop.call(this);

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

OpenWeather.prototype.fetchWeather = function(instance) {
    var self = instance,
        moduleName = "OpenWeather",
        langFile = self.controller.loadModuleLang(moduleName);
    
    http.request({
        url: "http://api.openweathermap.org/data/2.5/weather?q=" + self.config.city + "," + self.config.country,
        async: true,
        success: function(res) {
            try {
                var temp = Math.round((self.config.units === "celsius" ? res.data.main.temp - 273.15 : res.data.main.temp * 1.8 - 459.67) * 10) / 10,
                    icon = "http://openweathermap.org/img/w/" + res.data.weather[0].icon + ".png";

                self.vDev.set("metrics:level", temp);
                self.vDev.set("metrics:icon", icon);
            } catch (e) {
                self.controller.addNotification("error", langFile.err_parse, "module", moduleName);
            }
        },
        error: function() {
            self.controller.addNotification("error", langFile.err_fetch, "module", moduleName);
        }
    });
};
