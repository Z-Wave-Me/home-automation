/*** RGB Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me> and Niels Roche <nir@zwave.eu>
Description:
    Binds several dimmers to make RGB device
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function RGB (id, controller) {
    // Call superconstructor first (AutomationModule)
    RGB.super_.call(this, id, controller);
}

inherits(RGB, AutomationModule);

_module = RGB;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

RGB.prototype.init = function (config) {
    RGB.super_.prototype.init.call(this, config);

    var self = this,
        rgbDevices = self.config.devices;

    function levelToColor(vDev) {
        var val = self.controller.devices.get(vDev).get("metrics:level");
        
        if (val === "on" || val === "255") {
            return 255;
        } else if (val === "off" || val === "0") {
            return 0;
        } else if (!isNaN(parseInt(val))) {
            return Math.round(parseInt(val) * 255.0/99.0);
        }
    }
    
    function colorToLevel(color) {
        return Math.round(color * 99.0 / 255.0);
    }
    
    this.vDev = this.controller.devices.create({
        deviceId: "RGB_" + this.id,
        defaults: {
            deviceType: "switchRGBW",
            metrics: {
                icon: '',
                title: 'RGB ' + this.id,
                color: {r: 0, g: 0, b: 0},
                level: 'off'
            }
        },
        overlay: {},
        handler:  function (command, args) {
            for (var prop in rgbDevices){
                switch (command) {
                    case "off":
                        self.controller.devices.get(rgbDevices[prop]).performCommand(command);
                        break;
                    case "on":
                        self.controller.devices.get(rgbDevices[prop]).performCommand("exact", { level: self.config.lastConfig[prop] } ); // take last value from lastConfig
                        break;
                    case "exact":
                        var l = colorToLevel(args[prop]);

                        self.config.lastConfig[prop] = l; // overwrite latest value
                        self.controller.devices.get(rgbDevices[prop]).performCommand("exact", { level: l } ); // set color level
                        break;
                }
            }
        },
        moduleId: this.id
    });
    

    this.handleLevel = function() {
        self.vDev.set("metrics:level", (
            levelToColor(rgbDevices.red) ||
            levelToColor(rgbDevices.green) ||
            levelToColor(rgbDevices.blue)
        ) ? 'on' : 'off');
    };
    
    this.handleR = function () {
        self.vDev.set("metrics:color:r", levelToColor(rgbDevices.red));
        self.handleLevel();
    };
    this.handleG = function () {
        self.vDev.set("metrics:color:g", levelToColor(rgbDevices.green));
        self.handleLevel();
    };
    this.handleB = function () {
        self.vDev.set("metrics:color:b", levelToColor(rgbDevices.blue));
        self.handleLevel();
    };
    this.controller.devices.on(rgbDevices.red, "change:metrics:level", this.handleR);
    this.controller.devices.on(rgbDevices.green, "change:metrics:level", this.handleG);
    this.controller.devices.on(rgbDevices.blue, "change:metrics:level", this.handleB);
};

RGB.prototype.stop = function () {
    var rgbDevices = this.config.devices;

    this.controller.devices.off(rgbDevices.red, "change:metrics:level", this.handleR);
    this.controller.devices.off(rgbDevices.green, "change:metrics:level", this.handleG);
    this.controller.devices.off(rgbDevices.blue, "change:metrics:level", this.handleB);

    this.handleR = null;
    this.handleG = null;
    this.handleB = null;
    
    if (this.vDev) {
        this.controller.devices.remove(this.vDev.id);
        this.vDev = null;
    }

    RGB.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
