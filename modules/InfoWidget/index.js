/*** InfoWidget Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: Niels Roche <nir@zwave.eu>
Description:
    Creates a text/information widget as devicetype 'text'.
    It is possible to internationalize one widget with EN,DE,RU or CN translation.
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function InfoWidget (id, controller) {
    // Call superconstructor first (AutomationModule)
    InfoWidget.super_.call(this, id, controller);
}

inherits(InfoWidget, AutomationModule);

_module = InfoWidget;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

InfoWidget.prototype.init = function (config) {
    InfoWidget.super_.prototype.init.call(this, config);

    var self = this,
        vDev;

    this.vDev = [];

    this.createTextWidgets = function(lang) {
        lng = lang? lang : self.controller.defaultLang

        if (self.config.widgets.length > 0 && self.config.internationalize === false) {

            self.config.widgets.forEach(function (widget, indx) {
                var devId = "InfoWidget_" + self.id + '_' + indx;

                if (self.vDev.indexOf(devId) === -1) {
                    vDev = this.controller.devices.create({
                        deviceId: devId,
                        defaults: {
                            metrics: {
                                title: widget.headline,
                                text: widget.text,
                                icon: widget.imgURI
                            }          
                        },
                        overlay: {
                            deviceType: "text"
                        },
                        moduleId: self.id
                    });

                    self.vDev.push(vDev);
                }
            });
        }

        if (self.config.widgetsInt && self.config.widgetsInt.length > 0 && self.config.internationalize === true) {
            
            self.config.widgetsInt.forEach(function (widget) {
                if (widget.lang === lng) {
                    var devId = "InfoWidget_" + self.id + "_Int";

                    if (self.vDev.indexOf(devId) === -1) {
                        vDev = this.controller.devices.create({
                            deviceId: devId,
                            defaults: {
                                metrics: {
                                    title: widget.headline,
                                    text: widget.text,
                                    icon: widget.imgURI
                                }          
                            },
                            overlay: {
                                deviceType: "text"
                            },
                            moduleId: self.id
                        });

                        self.vDev.push(vDev);
                    }
                }
            });

            this.controller.on('language.changed',self.updateIntWidgets);
        }
    };

    this.updateIntWidgets = function (lang) {
        var dev = self.config.widgetsInt.filter(function(widget) {
               return widget.lang === lang;
            });
        if (dev.length > 0) {
            self.vDev[0].set('metrics:title',dev[0].headline);
            self.vDev[0].set('metrics:text',dev[0].text);
            self.vDev[0].set('metrics:icon',dev[0].imgURI);
        }
    };

    this.createTextWidgets(self.controller.defaultLang);
    
};

InfoWidget.prototype.stop = function () {
    var self = this;
    
    this.controller.off('language.changed',self.updateIntWidgets);

    if (self.vDev) {
        self.vDev.forEach(function (dev) {
            this.controller.devices.remove(dev.id);
        });

        self.vDev = null;
    }

    InfoWidget.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
