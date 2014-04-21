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

    this.vDev = null;
    this.timer = setInterval(function() {
        self.fetchWeather(self);
    }, 3600*1000);
    self.fetchWeather(self);
};

OpenWeather.prototype.stop = function () {
    OpenWeather.super_.prototype.stop.call(this);

    if (this.timer)
        clearInterval(this.timer);
        
    if (this.vDev)
        this.controller.removeDevice(this.vDev.id);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

OpenWeather.prototype.fetchWeather = function(instance) {
    var self = instance;
    
    http.request({
        url: "http://api.openweathermap.org/data/2.5/weather?q=" + self.config.city + "," + self.config.country,
        async: true,
        success: function(res) {
            try {
                var temp = Math.round((self.config.units === "celsius" ? res.data.main.temp - 273.15 : res.data.main.temp) * 10) / 10,
                    icon = res.data.main.icon;

                if (!self.vDev) {
                    self.vDev = self.controller.collection.create("OpenWeather_" + self.id, {
                        deviceType: "probe",
                        metrics: {
                            probeTitle: 'Temperature',
                            scaleTitle: self.config.units === "celsius" ? '°C' : '°F',
                            level: temp,
                            icon: icon,
                            title: 'Weather ' + self.id
                        }
                    });
                } else {
                    self.vDev.setMetricValue("level", temp);
                    self.vDev.setMetricValue("icon", "http://openweathermap.org/img/w/" + icon + ".png");
                }
            } catch (e) {
                self.controller.addNotification("error", "Can not parse weather information", "module");
            }
        },
        error: function() {
            self.controller.addNotification("error", "Can not fetch weather information", "module");
        }
    });
};
