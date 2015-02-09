/*** YandexProbki Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: Yurkin Vitaliy <aivs@z-wave.me>
Description: Traffic Jam in Russia

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function YandexProbki (id, controller) {
    // Call superconstructor first (AutomationModule)
    YandexProbki.super_.call(this, id, controller);
}

inherits(YandexProbki, AutomationModule);

_module = YandexProbki;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

YandexProbki.prototype.init = function (config) {
    YandexProbki.super_.prototype.init.call(this, config);
    config.city

    var self = this;

    this.vDev = self.controller.devices.create({
        deviceId: "YandexProbki_" + this.id,
        defaults: {
            deviceType: "sensorMultilevel",
            metrics: {
                probeTitle: 'Yandex.Jams',
                scaleTitle: ""
            }
        },
        overlay: {
            metrics: {
                title: this.config.city,
                icon: "http://cdn1.iconfinder.com/data/icons/softwaredemo/PNG/48x48/Circle_Grey.png"
            }
        },
        moduleId: this.id
    });

    this.timer = setInterval(function() {
        self.fetchJams(self);
    }, 600*1000);
    self.fetchJams(self);
};

YandexProbki.prototype.stop = function () {
    YandexProbki.super_.prototype.stop.call(this);

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

YandexProbki.prototype.fetchJams = function(instance) {
    var self = instance;
    
    http.request({
        url: "http://api-maps.yandex.ru/services/traffic-info/1.0/?format=json&lang=en-EN",
        async: true,
        success: function(response) {
            try {
                var jam;
                var yandexIcon;

                response.data.GeoObjectCollection.features.forEach(function(item, index) {
                    if (item.name == self.config.city) {
                        if (typeof item.properties.JamsMetaData.level != 'undefined') {
                            jam = parseInt(item.properties.JamsMetaData.level);
                            yandexIcon = item.properties.JamsMetaData.icon;
                        }
                        else {
                            jam = "---";
                            yandexIcon = "grey";
                        }
                        console.log(item.name + " " + jam + " " + yandexIcon);
                    };
                });

                var icon;
                switch (yandexIcon) {
                    case "yellow":
                        icon = "http://cdn1.iconfinder.com/data/icons/softwaredemo/PNG/48x48/Circle_Yellow.png";
                        break;
                    case "red":
                        icon ="http://cdn1.iconfinder.com/data/icons/softwaredemo/PNG/48x48/Circle_Red.png";
                        break;
                    case "green":
                        icon = "http://cdn1.iconfinder.com/data/icons/softwaredemo/PNG/48x48/Circle_Green.png";
                        break;
                    default:
                        icon = "http://cdn1.iconfinder.com/data/icons/softwaredemo/PNG/48x48/Circle_Grey.png";
                }

                self.vDev.set("metrics:level", jam);
                self.vDev.set("metrics:icon", icon);
            } catch (e) {
                self.controller.addNotification("error", "Can not parse jams information.", "", "module", "YandexProbki", "__nt_yp_errParse_jam_info__");
            }
        },
        error: function() {
            self.controller.addNotification("error", "Can not fetch yandex jam information.", "", "module", "YandexProbki", "__nt_yp_errFetch_jam_info__");
        }
    });
};
