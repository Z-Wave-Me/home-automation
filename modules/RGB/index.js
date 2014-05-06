/*** RGBW Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me>
Description:
    Binds several dimmers to make RGB(W) device
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function RGBW (id, controller) {
    // Call superconstructor first (AutomationModule)
    RGBW.super_.call(this, id, controller);
}

inherits(RGBW, AutomationModule);

_module = RGBW;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

RGBW.prototype.init = function (config) {
    RGBW.super_.prototype.init.call(this, config);

    var self = this;

    this.red = this.controller.devices.get(this.config.red);
    this.green = this.controller.devices.get(this.config.green);
    this.blue = this.controller.devices.get(this.config.blue);
    
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
    
    this.vDev = this.controller.devices.create("RGBW_" + this.id, {
        deviceType: "switchRGBW",
        metrics: {
            level: (levelToColor(this.red) || levelToColor(this.green) || levelToColor(this.blue)) ? 'on' : 'off',
            color: {
                r: levelToColor(this.red),
                g: levelToColor(this.green),
                b: levelToColor(this.blue)
            },
            icon: '',
            title: 'RGB ' + this.id
        }
    }, function (command, args) {
        if (command === "on" || command === "off") {
            self.red.performCommand(command);
            self.green.performCommand(command);
            self.blue.performCommand(command);
        }
        if (command === "exact") {
            self.red.performCommand("exact", { level: colorToLevel(args.red) } );
            self.green.performCommand("exact", { level: colorToLevel(args.green) } );
            self.blue.performCommand("exact", { level: colorToLevel(args.blue) } );
        }
    });
    
    this.handleR = function () {
        self.vDev.set("metrics:color:r", self.red.get("metrics:level"));
    }
    this.handleG = function () {
        self.vDev.set("metrics:color:g", self.green.get("metrics:level"));
    }
    this.handleB = function () {
        self.vDev.set("metrics:color:b", self.blue.get("metrics:level"));
    }
    this.red.on("change:metrics:level", this.handleR);
    this.green.on("change:metrics:level", this.handleG);
    this.blue.on("change:metrics:level", this.handleB);
};

RGBW.prototype.stop = function () {
    this.red.off("change:metrics:level", this.handleR);
    this.green.off("change:metrics:level", this.handleG);
    this.blue.off("change:metrics:level", this.handleB);
    this.handleR = null;
    this.handleG = null;
    this.handleB = null;
    
    if (this.vDev) {
        this.controller.devices.remove(this.vDev.id);
        this.vDev = null;
    }

    RGBW.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
