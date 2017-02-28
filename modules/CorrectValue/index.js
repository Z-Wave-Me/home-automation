/*** CorrectValue Z-Way Home Automation module *************************************

 Version: 1.0.0
 (c) Z-Wave.Me, 2017

 -----------------------------------------------------------------------------
 Author: Yurkin Vitaliy   <aivs@z-wave.me>
 Description:
     Correct value of sensors like temperature, humidity, etc.

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function CorrectValue (id, controller) {
    // Call superconstructor first (AutomationModule)
    CorrectValue.super_.call(this, id, controller);
};

inherits(CorrectValue, AutomationModule);

_module = CorrectValue;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

CorrectValue.prototype.init = function (config) {
    // Call superclass' init (this will process config argument and so on)
    CorrectValue.super_.prototype.init.call(this, config);

    // Remember "this" for detached callbacks (such as event listener callbacks)
    var self = this;

    this.handler = function (vDev) {
        var value = parseFloat(vDev.get("metrics:level"));
        self.vDevNew.set("metrics:level", value + parseFloat(self.config.correctionValue));
    };

    this.createCorrectedDev = function () {
        var sensor = self.controller.devices.get(self.config.device);
        sensor.set("visibility", !(self.config.hide));

        self.vDevNew = self.controller.devices.create({
                deviceId: self.id+"_CorrectValue_"+self.config.correctionValue,
                defaults: {
                    deviceType: "sensorMultilevel",
                    metrics: {
                        probeTitle: sensor.get("metrics:probeTitle"),
                        scaleTitle: sensor.get("metrics:scaleTitle"),
                        level: parseFloat(sensor.get("metrics:level")) + parseFloat(self.config.correctionValue),
                        icon: sensor.get("metrics:icon"),
                        title: sensor.get("metrics:title") + " " + self.config.correctionValue,
                    }
                },
                overlay: {},
                moduleId: self.id
        });

        // Setup metric update event listener
        self.controller.devices.on(self.config.device, 'change:metrics:level', self.handler);
    }

    this.deviceCreated = function (vDev) {
        if (vDev.id === self.config.device) {
            self.createCorrectedDev();
        }
    }

    this.deviceRemoved = function (vDev) {
        if (vDev.id === self.controller.devices.get(self.config.device)) {
            self.controller.devices.remove(self.id+"_Corrected_"+self.config.correctionValue);
        }
    }

    // Bind to event "Added new device" -- > Bind to new device
    this.controller.devices.on('created', this.deviceCreated);   

     // Bind to event "Removed device" --> Unbind device
    this.controller.devices.on('removed', this.deviceRemoved); 

    if (this.controller.devices.get(this.config.device)) {
        self.createCorrectedDev();
    }

};

CorrectValue.prototype.stop = function () {
    CorrectValue.super_.prototype.stop.call(this);
    this.controller.devices.off(this.config.device, 'change:metrics:level', this.handler);
    this.controller.devices.remove(this.id+"_Corrected_"+this.config.correctionValue);
};
// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

// This module doesn't have any additional methods
