/*** GlobalCache Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me>
Description:
    Implements Global Cache support
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function GlobalCache (id, controller) {
    // Call superconstructor first (AutomationModule)
    GlobalCache.super_.call(this, id, controller);
}

inherits(GlobalCache, AutomationModule);

_module = GlobalCache;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

GlobalCache.prototype.init = function (config) {
    GlobalCache.super_.prototype.init.call(this, config);

    var self = this;        
 
    var vDev = self.controller.devices.create({
        deviceId: "GlobalCache_Device_" + this.id,
        defaults: {
            deviceType: "toggleButton",
            metrics: {
                title: 'Global Cache ' + this.id,
                icon: ""
            }
        },
        overlay: {},
        handler: function (command, args) {
            try {
                var sock = new sockets.tcp();
                sock.connect(self.config.host, 4998);
                sock.send(self.config.data + "\r\n\r\n");
            } catch (e) {
                console.log("Failed to send data to GlobalCache: " + e.toString() + " (IP: " + self.config.host + ", data: \"" + self.config.data + "\")");
            } finally {
                sock.close();
            }
        },
        moduleId: this.id
    });
};

GlobalCache.prototype.stop = function () {
    this.controller.devices.remove("GlobalCache_Device_" + this.id);
    
    GlobalCache.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
