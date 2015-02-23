/*** OpenWeather Extended Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: Niels Roche <nir@z-wave.me>
Description:
    This module creates an extended temperature widget that shows you 
    in addition to the temperature also humidity, pressure etc.

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function OpenWeatherExtended (id, controller) {
    // Call superconstructor first (AutomationModule)
    OpenWeatherExtended.super_.call(this, id, controller);
}

inherits(OpenWeatherExtended, AutomationModule);

_module = OpenWeatherExtended;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

OpenWeatherExtended.prototype.init = function (config) {
    OpenWeatherExtended.super_.prototype.init.call(this, config);

    var self = this;

    this.vDev = self.controller.devices.create({
        deviceId: "OpenWeatherExtended_" + this.id,
        defaults: {
            deviceType: "sensorMultiline",
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
        self.fetchExtendedWeather(self);
    }, 3600*1000);
    self.fetchExtendedWeather(self);
};

OpenWeatherExtended.prototype.stop = function () {
    OpenWeatherExtended.super_.prototype.stop.call(this);

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

OpenWeatherExtended.prototype.fetchExtendedWeather = function(instance) {
    var self = instance,
        moduleName = "OpenWeatherExtended",
        langFile = self.controller.loadModuleLang(moduleName);
    
    http.request({
        url: "http://api.openweathermap.org/data/2.5/weather?q=" + self.config.city + "," + self.config.country,
        async: true,
        success: function(res) {
            try {
                var main = res.data.main,
                    weather = res.data.weather,
                    wind = res.data.wind,
                    country = res.data.sys.country,
                    weatherData = {'main': main,'weather': weather, 'wind': wind},
                    temp = Math.round((self.config.units === "celsius" ? main.temp - 273.15 : main.temp * 1.8 - 459.67) * 10) / 10,
                    icon = "http://openweathermap.org/img/w/" + weather[0].icon + ".png",
                    flag = "http://openweathermap.org/images/flags/" + country.toLowerCase() + ".png";

                self.vDev.set("metrics:zwaveOpenWeather", weatherData);
                self.vDev.set("metrics:level", temp);
                self.vDev.set("metrics:icon", icon);
                self.vDev.set("metrics:country", country);
                self.vDev.set("metrics:flag", flag);
            } catch (e) {
                self.controller.addNotification("error", langFile.err_parse, "module", moduleName);
            }
        },
        error: function() {
            self.controller.addNotification("error", langFile.err_fetch, "module", moduleName);
        }
    });
};
