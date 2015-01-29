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

        // depending on device type choose the correct notification
        switch(devType) {
            case 'switchBinary':
                self.controller.addNotification('info', 'Device "' + devName + '" has switched "' + lvl + '".', 'device');
                break;
            case 'switchMultilevel':
                self.controller.addNotification('info', 'The level of device "' + devName + '" has updated to "' + lvl + '".', 'device');
                break;
            case 'switchControl':
                self.controller.addNotification('info', 'Device "' + devName + '" has switched "' + lvl + '".', 'device');
                break;
            case 'sensorBinary':
                self.controller.addNotification('info', 'Sensor "' + devName + '" has switched "' + lvl + '".', 'device');
                break;
            case 'sensorMultilevel':
                self.controller.addNotification('info', 'Sensor "' + devName + '" has updated "' + probeTitle + '" to "' + lvl + ' ' + scaleUnit + '".', 'device');
                break;
            case 'sensorMultiline':
                //should be expanded
                self.controller.addNotification('info', 'Multiline Sensor "' + devName + '" has updated "' + probeTitle + '" to "' + lvl + ' ' + scaleUnit + '".', 'device');
                break;
            case 'battery':
                self.controller.addNotification('info', 'Battery "' + devName + '" - Level has changed.', 'device');
                break;
            case 'thermostat':
                self.controller.addNotification('info', 'Thermostat "' + devName + '" has updated "' + probeTitle + '" to "' + lvl + ' ' + scaleUnit + '".', 'device');
                break;
            case 'fan':
                self.controller.addNotification('info', 'Fan "' + devName + '" metrics has changed - "' + lvl + '".', 'device');
                break;
            case 'doorlock':
                self.controller.addNotification('info', 'Door "' + devName + '" - lock status has changed.', 'device');
                break;
            default:
                self.controller.addNotification('info', 'Device "' + devName + '" has changed metrics or status.', 'device');
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