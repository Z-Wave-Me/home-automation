/*** MultilineSensor Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2015
-----------------------------------------------------------------------------
Author: Niels Roche <nir@zwave.eu>
Description:
    Choose different sensors to merge them into one virtual device.
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function MultilineSensor (id, controller) {
    // Call superconstructor first (AutomationModule)
    MultilineSensor.super_.call(this, id, controller);
}

inherits(MultilineSensor, AutomationModule);

_module = MultilineSensor;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

MultilineSensor.prototype.init = function (config) {
    MultilineSensor.super_.prototype.init.call(this, config);

    var self = this,
    	devices = [],
    	deviceMetrics = [],
    	item = {},
        firstDevice = {};

    this.vDev = null;

    this.updateAttributes = function(dev) {
        var sensors = [],
            indx = null;
        
        sensors = self.vDev.get('metrics:sensors');

        indx = sensors.map(function(e) { return e.selectedDevice; }).indexOf(dev.id);

        if(indx !== -1){
            sensors[indx].set('title', dev.get('metrics:title'));
            sensors[indx].set('metrics', dev.get('metrics'));
        }

        if(sensors.length > 0){
            firstDevice = sensors[0];
        }

        var icon = firstDevice && firstDevice.metrics.icon? firstDevice.metrics.icon : '',
            level = firstDevice && firstDevice.metrics.level? firstDevice.metrics.level : '',
            scaleTitle = firstDevice && firstDevice.metrics.scaleTitle? firstDevice.metrics.scaleTitle : '';

        self.vDev.set('metrics:icon', icon);
        self.vDev.set('metrics:level', level);
        self.vDev.set('metrics:scaleTitle', scaleTitle);
    };

    this.createVirtualDevice = function(dev){
        var indx = self.config.devices.map(function(e) { return e.selectedDevice; }).indexOf(dev.id);
        
        if(indx > -1 && deviceMetrics.map(function(e) { return e.selectedDevice; }).indexOf(dev.id) === -1){
            item = {
                id: dev.id,
                deviceType: dev.get('deviceType'),
                metrics: dev.get('metrics'),
                hasHistory: dev.get('hasHistory'),
                updateTime: dev.get('updateTime')
            };

            deviceMetrics.push(item);

            if(self.config.devices[indx].hide === true) {
                dev.set({'visibility': false});
            }else{
                dev.set({'visibility': true});
            }

            if(deviceMetrics.length > 0){
                firstDevice = deviceMetrics[0];
            }

            //var icon = firstDevice && firstDevice.metrics.icon? firstDevice.metrics.icon : '',
            var level = firstDevice && firstDevice.metrics.level? firstDevice.metrics.level : '',
                scaleTitle = firstDevice && firstDevice.metrics.scaleTitle? firstDevice.metrics.scaleTitle : '';

            self.vDev.set('metrics:sensors', deviceMetrics);
            //self.vDev.set('metrics:icon', icon);
            self.vDev.set('metrics:level', level);
            self.vDev.set('metrics:scaleTitle', scaleTitle);

            self.controller.devices.on(dev.id, 'change:metrics:level', self.updateAttributes);
            self.controller.devices.on(dev.id, 'change:[object Object]', self.updateAttributes);
        }
    };

    self.controller.devices.filter(function (dev){
        return self.config.devices.map(function(e) { return e.selectedDevice; }).indexOf(dev.id) > -1;
    }).forEach(function (dev){
        var indx = self.config.devices.map(function(e) { return e.selectedDevice; }).indexOf(dev.id);
             
        item = {
            id: dev.id,
            deviceType: dev.get('deviceType'),
            metrics: dev.get('metrics'),
            hasHistory: dev.get('hasHistory'),
            updateTime: dev.get('updateTime')
        };

        deviceMetrics.push(item);

        if(self.config.devices[indx].hide === true) {
            dev.set({'visibility': false});
        }else{
            dev.set({'visibility': true});
        }

        self.controller.devices.on(dev.id, 'change:metrics:level', self.updateAttributes);
        self.controller.devices.on(dev.id, 'change:[object Object]', self.updateAttributes);
    });

    this.vDev = this.controller.devices.create({
        deviceId: "Multiline_" + this.id,
        defaults: {
            metrics: {
                title: 'Multiline Sensor ' + this.id,
                icon: ''
            }
        },
        overlay: {
            deviceType: 'sensorMultiline',
            metrics: {
                title: 'Multiline Sensor ' + this.id,
                sensors: deviceMetrics,
                icon: ''
            }
        },
        handler: function(command){
            if(command === 'update' && deviceMetrics.length > 0){
                deviceMetrics.forEach(function(sensor){
                    getDev = self.controller.devices.filter(function(vDev){
                                return sensor.id === vDev.id;
                            });
                    try{
                        getDev[0].performCommand('update');
                    } catch(e) {
                        self.controller.addNotification('device-info', 'Update has failed. Error:' + e , 'device-status', getDev[0].id);
                    }                    
                });
            }
        },
        moduleId: this.id
    });

    self.controller.devices.on('created', self.createVirtualDevice);
};

MultilineSensor.prototype.stop = function () {
    var self = this;

	if (this.vDev) {
        this.controller.devices.remove(this.vDev.id);
        this.vDev = null;
    }

    self.controller.devices.filter(function (dev){
        return self.config.devices.map(function(e) { return e.selectedDevice; }).indexOf(dev.id) > -1;
    }).forEach(function (dev){
        
        if(dev.get('visibility') === false) {
            dev.set({'visibility': true});
        }

        self.controller.devices.off(dev.id, 'change:metrics:level', self.updateAttributes);
        self.controller.devices.off(dev.id, 'change:[object Object]', self.updateAttributes);
    });

    MultilineSensor.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------