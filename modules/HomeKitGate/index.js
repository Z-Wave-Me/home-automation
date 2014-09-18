/*
 Version: 1.0.1
 (c) Z-Wave.Me, 2014

 -----------------------------------------------------------------------------
 Author: Alex Skalozub <pieceofsummer@gmail.com> and Poltorak Serguei <ps@z-wave.me>
 Description:
     This module announces Z-Way HA devices to HomeKit

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function HomeKitGate (id, controller) {
    // Call superconstructor first (AutomationModule)
    HomeKitGate.super_.call(this, id, controller);

    // Create instance variables
};

inherits(HomeKitGate, AutomationModule);

_module = HomeKitGate;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

HomeKitGate.prototype.init = function (config) {
    // Call superclass' init (this will process config argument and so on)
    HomeKitGate.super_.prototype.init.call(this, config);

    this.hk = new HomeKit(this.config.name, function(r) {
        if (r.method == "GET" && r.path == "/accessories") {
            return this.accessories.serialize(r);
        } else if (r.method == "PUT" && r.path == "/characteristics" && r.data && r.data.characteristics) {
            r.data.characteristics.forEach(function (c) {
                if (typeof c.value !== "undefined") {   
                    // use c.aid, c.iid and c.value here
                    var characteristic = this.accessories.find(c.aid, c.iid);
                    if (characteristic)
                        characteristic.value = c.value;

                    // update subscribers
                    this.update(c.aid, c.iid);
                }                          
                                           
                if (typeof c.events === "boolean") { 
                    // set event subscription state  
                    r.events(c.aid, c.iid, c.events);
                }
            }, this);
            return null; // 204
        } else if (r.method == "GET" && r.path.substring(0, 20) == "/characteristics?id=") {
            var ids = r.path.substring(20).split('.').map(function(x) { return parseInt(x) });

            var characteristic = this.accessories.find(ids[0], ids[1]);
            if (characteristic) {
                return {
                    characteristics: [
                        { aid: ids[0], iid: ids[1], value: characteristic.value }
                    ]
                };
            }
        }
    });

    this.hk.accessories = new HKAccessoryCollection(this.hk);

    {
        with (this.hk.accessories) {
            with (addAccessory("RaZberry", "z-wave.me", "ZME-RAZ01-EU", "ZMERAZ01EU12345")) {
                with (addService(HomeKit.Services.Lightbulb, "Bedroom")) {
                    addCharacteristic(HomeKit.Characteristics.PowerState, "bool", {
                        get: function() { return true; },
                        set: function(value) { debugPrint(value); }
                    });
                    with (addCharacteristic(HomeKit.Characteristics.Brightness, "float", 50, [ "pr", "pw" ])) {
                        minValue = 1;
                        maxValue = 99;
                        minStep = 1;   
                    };
                };
            };
        };   
    };
        
    console.log(this.hk.name, "PIN:", this.hk.pin);
};

HomeKitGate.prototype.stop = function () {
    HomeKitGate.super_.prototype.stop.call(this);

    if (this.hk) {
        this.hk.stop();
    }
};
// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

// This module doesn't have any additional methods



