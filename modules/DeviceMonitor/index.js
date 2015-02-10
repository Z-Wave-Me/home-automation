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
        var devId = vDev.get('id'),
            devType = vDev.get('deviceType'),
            devName = vDev.get('metrics:title'),
            probeTitle = vDev.get('metrics:probeTitle'),
            scaleUnit = vDev.get('metrics:scaleTitle'),
            lvl = vDev.get('metrics:level');

        // depending on device type choose the correct notification
        switch(devType) {
            case 'switchBinary':
            case 'switchControl':
            case 'sensorBinary':
            case 'fan':
            case 'doorlock':
            case 'switchMultilevel':
            case 'battery':
                var values = devType + ' :: ' + devName + ' :: ' + lvl,
                    message = {
                    "en":"Sensor or Device status has changed - " + values,
                    "de":"Der Status des folgenden Sensors oder Gerätes hat sich verändert - " + values
                };
                self.controller.addNotification('info', message, 'device', devId);
                break;
            case 'sensorMultilevel':
            case 'sensorMultiline':
            case 'thermostat':
                var values = devType + ' :: ' + devName + ' :: ' + probeTitle + ' :: ' + lvl + ' ' + scaleUnit,
                    message = {
                    "en":"Sensor status has changed - " + values,
                    "de":"Der Status des folgenden Sensors hat sich verändert - " + values
                };
                self.controller.addNotification('info', message, 'device', devId);
                break;
            default:
                var values = devType + ' :: ' + devName,
                    message = {
                    "en":"Device has changed metrics or status - " + values,
                    "de":"Der Status des folgenden Gerätes hat sich verändert - " + values
                };
                self.controller.addNotification('info', message, 'device', devId);
                break;
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
    var allDevices = this.controller.devices;
    var filteredDevices = [];
    
    if(deviceType == 'all'){
        return allDevices;
    } else {   
        
        filteredDevices = allDevices.filter(function (vDev){
            return vDev.get('deviceType') === deviceType;
        });        

        return filteredDevices;  
    }      
};