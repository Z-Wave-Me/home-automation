/*** DeviceMonitor Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2015
-----------------------------------------------------------------------------
Author: Niels Roche <nir@zwave.eu>
Description:
    Creates a module that listens to the status of every device in the background. 
    It sends notifications automatically if it has changed.
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function DeviceMonitor (id, controller) {
    // Call superconstructor first (AutomationModule)
    DeviceMonitor.super_.call(this, id, controller);
}

inherits(DeviceMonitor, AutomationModule);

_module = DeviceMonitor;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

DeviceMonitor.prototype.init = function (config) {
    DeviceMonitor.super_.prototype.init.call(this, config);

    var self = this;

    this.writeNotification = function (vDev) {
        var devType = vDev.get('deviceType'),
            devName = vDev.get('metrics:title'),
            probeTitle = vDev.get('metrics:probeTitle'),
            scaleUnit = vDev.get('metrics:scaleTitle'),
            lvl = vDev.get('metrics:level');

        if(devType === 'switchBinary') {
            self.controller.addNotification('info', 'Device "' + devName + '" has switched "' + lvl + '".', 'device');
        } 
        else if(devType === 'switchMultilevel') {
            self.controller.addNotification('info', 'The level of device "' + devName + '" has updated to "' + lvl + '".', 'device');
        } 
        else if(devType === 'sensorBinary') {
            self.controller.addNotification('info', 'Sensor "' + devName + '" has switched "' + lvl + '".', 'device');
        } 
        else if(devType === 'sensorMultilevel') {
            self.controller.addNotification('info', 'Sensor "' + devName + '" has updated "' + probeTitle + '" to "' + lvl + ' ' + scaleUnit + '".', 'device');
        } 
        else {
            self.controller.addNotification('info', 'Device "' + devName + '" has changed metrics.', 'device');
        }
        
    };
   
    // Setup metric update event listener
    // monitor different devices
    self.config.monitorDevices.forEach(function(x) {
        self.controller.devices.on(x,'change:metrics:level', self.writeNotification);
    });
    
    // monitor different device types
    self.config.monitorDeviceTypes.forEach( function(devType) {
        self.deviceCollector(devType).forEach( function(x) {
            self.controller.devices.on(x.id,'change:metrics:level', self.writeNotification);
        });
    });

};

DeviceMonitor.prototype.stop = function () {
    var self = this;

    // Setup metric update event listener
    self.config.monitorDevices.forEach(function(x) {
        self.controller.devices.off(x,'change:metrics:level', self.writeNotification);
    });

    self.config.monitorDeviceTypes.forEach( function(devType) {
       self.deviceCollector(devType).forEach( function(x) {
            self.controller.devices.off(x.id,'change:metrics:level', self.writeNotification);
        });
    });

    DeviceMonitor.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

DeviceMonitor.prototype.deviceCollector = function(deviceType){
    var allDevices = this.controller.devices.models;
    var filteredDevices = [];
    
    if(deviceType == 'all'){
        return allDevices;
    } else {   
        for( var i = 0; i < allDevices.length; i++) {
           
            if(allDevices[i].get('deviceType') == deviceType) {
                filteredDevices.push(allDevices[i]);
            }
        }
        return filteredDevices;
    }
};