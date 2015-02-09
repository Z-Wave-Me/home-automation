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
                self.controller.addNotification('info', "Sensor or Device status has changed - [DEVICETYPE] :: [DEVICE] :: [LEVEL] = ", devType + ' :: ' + devName + ' :: ' + lvl, 'device', devId, '__nt_dm_change_metric__');
                break;
            case 'sensorMultilevel':
            case 'sensorMultiline':
            case 'thermostat':
                self.controller.addNotification('info', "Sensor status has changed - [DEVICETYPE] :: [DEVICE] :: [MEASUREMENT] :: [LEVEL] = ", devType + ' :: ' + devName + ' :: ' + probeTitle + ' :: ' + lvl + ' ' + scaleUnit, 'device', devId, '__nt_dm_change_multi_metrics__');
                break;
            default:
                self.controller.addNotification('info', 'Device has changed metrics or status - [DEVICETYPE] :: [DEVICE] = ', devType + ' :: ' + devName, 'device', devId, '__nt_dm_change_metrics_unknown__');
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