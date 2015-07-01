/*** RGB Z-Way HA module *******************************************

Version: 1.0.1
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me> 
-- changed by: Niels Roche <nir@zwave.eu>

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

    this.lastConfig = {
        r: 99,
        g: 99,
        b: 99
    };

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
                title: 'RGB ' + this.id,
                color: {r: 0, g: 0, b: 0},
                level: 'off'
            }
        },
        overlay: {},
        handler:  function (command, args) {
            switch(command){
                case "off":
                    self.controller.devices.get(self.config.red).performCommand(command);
                    self.controller.devices.get(self.config.green).performCommand(command);
                    self.controller.devices.get(self.config.blue).performCommand(command);
                    break;
                case "exact":
                    // change lastConfig values
                    self.lastConfig.r = colorToLevel(args.red);
                    self.lastConfig.g = colorToLevel(args.green);
                    self.lastConfig.b = colorToLevel(args.blue);

                    // set color
                    self.controller.devices.get(self.config.red).performCommand("exact", { level: colorToLevel(args.red) } );
                    self.controller.devices.get(self.config.green).performCommand("exact", { level: colorToLevel(args.green) } );
                    self.controller.devices.get(self.config.blue).performCommand("exact", { level: colorToLevel(args.blue) } );
                    break;
                default:
                    self.controller.devices.get(self.config.red).performCommand("exact", { level: self.lastConfig.r } );
                    self.controller.devices.get(self.config.green).performCommand("exact", { level: self.lastConfig.g } );
                    self.controller.devices.get(self.config.blue).performCommand("exact", { level: self.lastConfig.b } );
            }
        },
        moduleId: this.id
    });
    

    this.handleLevel = function() {
        self.vDev.set("metrics:level", (
            levelToColor(self.controller.devices.get(this.config.red)) ||
            levelToColor(self.controller.devices.get(this.config.green)) ||
            levelToColor(self.controller.devices.get(this.config.blue))
        ) ? 'on' : 'off');
    };
    
    this.handleR = function () {
        self.vDev.set("metrics:color:r", levelToColor(self.controller.devices.get(self.config.red)));
        self.handleLevel();
    };
    this.handleG = function () {
        self.vDev.set("metrics:color:g", levelToColor(self.controller.devices.get(self.config.green)));
        self.handleLevel();
    };
    this.handleB = function () {
        self.vDev.set("metrics:color:b", levelToColor(self.controller.devices.get(self.config.blue)));
        self.handleLevel();
    };
    this.controller.devices.on(self.config.red, "change:metrics:level", this.handleR);
    this.controller.devices.on(self.config.green, "change:metrics:level", this.handleG);
    this.controller.devices.on(self.config.blue, "change:metrics:level", this.handleB);
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
