/*** ThermostatDevice Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me>
Description:
    Implements thermostat device based on temperature sensor and switch
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function ThermostatDevice (id, controller) {
    // Call superconstructor first (AutomationModule)
    ThermostatDevice.super_.call(this, id, controller);
}

inherits(ThermostatDevice, AutomationModule);

_module = ThermostatDevice;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

ThermostatDevice.prototype.init = function (config) {
    ThermostatDevice.super_.prototype.init.call(this, config);

    var self = this;

    this.vDev = this.controller.devices.create({
        deviceId: "ThermostatDevice_" + this.id,
        defaults: {
            deviceType: "thermostat",
            metrics: {
		scaleTitle:  '°C',
                level: 18,
                min: 5,
                max: 40,
                icon: '',
                title: 'Thermostat Device ' + this.id
            }
        },
        overlay: {},
        handler: function (command, args) {
            self.vDev.set("metrics:level", args.level);
            self.checkTemp();
        },
        moduleId: this.id
    });
    
    this.controller.devices.on(this.config.sensor, 'change:metrics:level', function() {
    	self.checkTemp();
    });
};

ThermostatDevice.prototype.stop = function () {
    var self = this;

    this.controller.devices.off(this.config.sensor, 'change:metrics:level', function() {
    	self.checkTemp();
    });

    if (this.vDev) {
        this.controller.devices.remove(this.vDev.id);
        this.vDev = null;
    }

    ThermostatDevice.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

ThermostatDevice.prototype.checkTemp = function () {
    var vDevSwitch = this.controller.devices.get(this.config.switch),
        vDevSensor = this.controller.devices.get(this.config.sensor),
        vDev = this.vDev;
    
    if (vDevSwitch && vDevSensor && vDev) {
        if ((vDevSensor.get('metrics:level') + this.config.hysteresis < vDev.get('metrics:level')) && (vDevSwitch.get('metrics:level') == "off" && this.config.heaton || vDevSwitch.get('metrics:level') == "on" && !this.config.heaton)) {
            vDevSwitch.performCommand(this.config.heaton ? "on" : "off");
        }
        if ((vDevSensor.get('metrics:level') - this.config.hysteresis > vDev.get('metrics:level')) && (vDevSwitch.get('metrics:level') == "on" && this.config.heaton || vDevSwitch.get('metrics:level') == "off" && !this.config.heaton)) {
            vDevSwitch.performCommand(this.config.heaton ? "off" : "on");
        }
    }
}
