/*** BackgroundNotificationListener Z-Way HA module *******************************************

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

function BackgroundNotificationListener (id, controller) {
    // Call superconstructor first (AutomationModule)
    BackgroundNotificationListener.super_.call(this, id, controller);
}

inherits(BackgroundNotificationListener, AutomationModule);

_module = BackgroundNotificationListener;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

BackgroundNotificationListener.prototype.init = function (config) {
    BackgroundNotificationListener.super_.prototype.init.call(this, config);

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
    
    this.controller.devices.on('change:metrics:level', this.writeNotification);

};

BackgroundNotificationListener.prototype.stop = function () {

    BackgroundNotificationListener.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------