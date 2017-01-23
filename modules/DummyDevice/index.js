/*** DummyDevice Z-Way HA module *******************************************

Version: 1.0.1
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me>, Ray Glendenning <ray.glendenning@gmail.com>
Description:
    Creates a Dummy device
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function DummyDevice (id, controller) {
    // Call superconstructor first (AutomationModule)
    DummyDevice.super_.call(this, id, controller);
}

inherits(DummyDevice, AutomationModule);

_module = DummyDevice;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

DummyDevice.prototype.init = function (config) {
    DummyDevice.super_.prototype.init.call(this, config);

    var self = this;

    this.vDev = this.controller.devices.create({
        deviceId: "DummyDevice_" + this.id,
        defaults: {
            metrics: {
                level: self.config.deviceType === 'switchMultilevel'? 0 : 'off',
                title: self.getInstanceTitle(this.id)
            }
        },
        overlay: {
            deviceType: this.config.deviceType
        },
        handler: function(command, args) {
            
            if (command != 'update') {
                var level = command;
                
                if (this.get('deviceType') === "switchMultilevel") {
                    if (command === "on") {
                        level = 99;
                    } else if (command === "off") {
                        level = 0;
                    } else {
                        level = args.level;
                    }
                }

                this.set("metrics:level", level);
            }
        },
        moduleId: this.id
    });
};

DummyDevice.prototype.stop = function () {
    if (this.vDev) {
        this.controller.devices.remove(this.vDev.id);
        this.vDev = null;
    }

    DummyDevice.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

DummyDevice.prototype.getInstanceTitle = function (instanceId) {
    var instanceTitle = this.controller.instances.filter(function (instance){
        return instance.id === instanceId;
    });

    return instanceTitle[0] && instanceTitle[0].title? instanceTitle[0].title : 'Dummy ' + this.id;
};