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
                                           
                if (typeof c.ev === "boolean") { 
                    // set event subscription state  
                    r.events(c.aid, c.iid, c.ev);
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
        } else if (r.path == "/identify") {
        	console.log(this.name, "PIN:", this.pin);
        }
    });

    this.hk.accessories = new HKAccessoryCollection(this.hk);
	
	// add main accessory
	this.hk.accessories.addAccessory("RaZberry", "z-wave.me", "RaZberry", "RaZberry");

	this.mapping = {}

	var self = this;	
	
	var onDeviceAddedCore = function (vDev) {
		var title = vDev.get("metrics:title") || vDev.id;
		var manufacturer = "z-wave.me"; // todo
		var deviceType = vDev.get("deviceType") || "virtualDevice";
		
		var m = self.mapping[vDev.id] = {};
		var accessory = m.$accessory = self.hk.accessories.addAccessory(title, manufacturer, deviceType, vDev.id);

		if (deviceType === "sensorMultilevel" && vDev.id.substring(0, 12) === "OpenWeather_") {
			var serviceUUID = "1001";

			var service = accessory.addService(serviceUUID, "Temperature");

			m.level = service.addCharacteristic(HomeKit.Characteristics.CurrentTemperature, "float", {
				get: function() { return parseFloat(vDev.get("metrics:level")) || 0.0; }
			});
		}
		else if (deviceType == "sensorMultilevel") {
			var serviceUUID = "1002";
		
			var service = accessory.addService(serviceUUID, "Multilevel Sensor");
			
			m.level = service.addCharacteristic(HomeKit.Characteristics.Brightness, "float", {
				get: function() { return parseFloat(vDev.get("metrics:level")) || 0.0; }
			});
		}
		else if (deviceType == "switchBinary") {
			var serviceUUID = HomeKit.Services.Lightbulb;
		
			var service = accessory.addService(serviceUUID, "Binary Switch");
			
			m.level = service.addCharacteristic(HomeKit.Characteristics.PowerState, "bool", {
				get: function() { return vDev.get("metrics:level") === "on"; },
				set: function(value) { vDev.performCommand("on" : "off"); }
			});
		}
		else if (deviceType == "switchMultilevel") {
			var serviceUUID = "1004";
		
			var service = accessory.addService(serviceUUID, "Multilevel Switch");
			
			m.level = service.addCharacteristic(HomeKit.Characteristics.Brightness, "float", {
				get: function() { return parseFloat(vDev.get("metrics:level")) || 0.0; },
				set: function(value) { vDev.performCommand("exact", { level: value }); }
			});
		}
		// todo
	}
	
	this.onDeviceAdded = function (vDev) {
		console.log("HK: added", vDev.id);
		onDeviceAddedCore(vDev);
		
		// update device tree
		self.hk.update();
	};
	
	this.onDeviceRemoved = function (vDev) {
		console.log("HK: removed", vDev.id);
		var m = self.mapping[vDev.id];
		if (m) {
			var accessory = m.$accessory;
			if (accessory)
				accessory.remove();
			
			delete self.mapping[vDev.id];
		}
		
		// update device tree
		self.hk.update();
	}
	
	this.onLevelChanged = function (vDev) {
		console.log("HK: updated", vDev.id);
		var m = self.mapping[vDev.id];
		if (!m) return;
		
		var accessory = m.$accessory;
		if (!accessory) return;
		
		var characteristics = m.level;
		if (!characteristics) return;
		
		self.hk.update(accessory.aid, characteristics.iid);
	}
	
	// add existing devices
	this.controller.devices.each(onDeviceAddedCore);
	
	// listen for future device collection changes
	this.controller.devices.on("created", this.onDeviceAdded);
	this.controller.devices.on("removed", this.onDeviceRemoved);
	this.controller.devices.on("change:metrics:level", this.onLevelChanged);
	
	// update device tree
    this.hk.update();
    
    console.log("HomeKit PIN:", this.hk.pin);
};

HomeKitGate.prototype.stop = function () {
    HomeKitGate.super_.prototype.stop.call(this);

	this.controller.devices.off("created", this.onDeviceAdded);
	this.controller.devices.off("removed", this.onDeviceRemoved);
	this.controller.devices.off("change:metrics:level", this.onLevelChanged);

    if (this.hk) {
        this.hk.stop();
    }
    
    delete this.mapping;
    delete this.onDeviceAdded;
    delete this.onDeviceRemoved;
    delete this.onLevelChanged;
};
// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
