/*** RGB Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me>
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

    var self = this;

    function levelToColor(vDev) {
        var val = vDev.get("metrics:level");
        
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
                title: 'RGB ' + this.id
            }
        },
        overlay: {},
        handler:  function (command, args) {
            if (command === "on" || command === "off") {
                self.controller.devices.get(this.config.red).performCommand(command);
                self.controller.devices.get(this.config.green).performCommand(command);
                self.controller.devices.get(this.config.blue).performCommand(command);
            }
            if (command === "exact") {
                self.controller.devices.get(this.config.red).performCommand("exact", { level: colorToLevel(args.red) } );
                self.controller.devices.get(this.config.green).performCommand("exact", { level: colorToLevel(args.green) } );
                self.controller.devices.get(this.config.blue).performCommand("exact", { level: colorToLevel(args.blue) } );
            }
        },
        moduleId: this.id
    });
    

    this.handleLevel = function() {
        self.vDev.set("metrics:level", (levelToColor(self.controller.devices.get(this.config.red)) || levelToColor(self.controller.devices.get(this.config.green)) || levelToColor(self.controller.devices.get(this.config.blue))) ? 'on' : 'off');
    };
    
    this.handleR = function () {
        self.vDev.set("metrics:color:r", self.controller.devices.get(this.config.red).get("metrics:level"));
        self.handleLevel();
    };
    this.handleG = function () {
        self.vDev.set("metrics:color:g", self.controller.devices.get(this.config.green).get("metrics:level"));
        self.handleLevel();
    };
    this.handleB = function () {
        self.vDev.set("metrics:color:b", self.controller.devices.get(this.config.blue).get("metrics:level"));
        self.handleLevel();
    };
    this.controller.devices.on(this.config.red, "change:metrics:level", this.handleR);
    this.controller.devices.on(this.config.green, "change:metrics:level", this.handleG);
    this.controller.devices.on(this.config.blue, "change:metrics:level", this.handleB);
};

RGB.prototype.stop = function () {
    this.controller.devices.off(this.config.red, "change:metrics:level", this.handleR);
    this.controller.devices.off(this.config.green, "change:metrics:level", this.handleG);
    this.controller.devices.off(this.config.blue, "change:metrics:level", this.handleB);

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
