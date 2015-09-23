/*** MultilineSensor Z-Way HA module *******************************************

Version: 1.0.1
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
        firstDevice = {},
        allSensors = [];

    this.vDev = null;

    this.updateAttributes = function(dev) {
        var sensors = [],
            sensor = [],
            indx = null;
        
        sensors = self.vDev.get('metrics:sensors');

        sensor = sensors.filter(function(sensor){
            return sensor.id === dev.get('id');
        });

        if(sensor[0]){
            // update sensor metrics
            sensor[0].metrics = dev.get('metrics');

            // get first sensor
            firstDevice = sensors[0];
        }

        // update vDev metrics with values of first sensor
        self.vDev.set('metrics:icon', self.getIcon(firstDevice));
        self.vDev.set('metrics:level', self.getLevel(firstDevice));
        self.vDev.set('metrics:scaleTitle', self.getScaleTitle(firstDevice));
    };

    this.createVDevIfSensorsAreCreated = function(dev){
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

            // update vDev metrics 
            self.vDev.set('metrics:icon', self.getIcon(firstDevice));
            self.vDev.set('metrics:level', self.getLevel(firstDevice));
            self.vDev.set('metrics:scaleTitle', self.getScaleTitle(firstDevice));

            // listen to sensor changes
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

        // listen to sensor changes
        self.controller.devices.on(dev.id, 'change:metrics:level', self.updateAttributes);
        self.controller.devices.on(dev.id, 'change:[object Object]', self.updateAttributes);
    });

    this.vDev = this.controller.devices.create({
        deviceId: "Multiline_" + this.id,
        defaults: {
            metrics: {
                multilineType: 'multilineSensor',
                title: self.getInstanceTitle(this.id),
                icon: self.getIcon(deviceMetrics[0]),
                level: self.getLevel(deviceMetrics[0]),
                scaleTitle: self.getScaleTitle(deviceMetrics[0])
            }
        },
        overlay: {
            deviceType: 'sensorMultiline',
            metrics: {
                title: self.getInstanceTitle(this.id),
                sensors: deviceMetrics,
                icon: self.getIcon(deviceMetrics[0]),
                level: self.getLevel(deviceMetrics[0]),
                scaleTitle: self.getScaleTitle(deviceMetrics[0])
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
    
    // refresh/create virtual device if sensors are created (after restart)
    self.controller.devices.on('created', self.createVDevIfSensorsAreCreated);
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
        self.controller.devices.off('created', self.createVDevIfSensorsAreCreated);
    });

    MultilineSensor.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

MultilineSensor.prototype.getIcon = function (device) {
    return device && device.metrics.icon? device.metrics.icon : '';
};

MultilineSensor.prototype.getScaleTitle = function (device) {
    return device && device.metrics.scaleTitle? device.metrics.scaleTitle : '';
};

MultilineSensor.prototype.getLevel = function (device) {
    return device && device.metrics.level? device.metrics.level : '';
};

MultilineSensor.prototype.getInstanceTitle = function (instanceId) {
    var instanceTitle = this.controller.instances.filter(function (instance){
        return instance.id === instanceId;
    });

    return instanceTitle[0] && instanceTitle[0].title? instanceTitle[0].title : 'Multiline Sensor ' + this.id;
};

MultilineSensor.prototype.getTitle = function (device) {
    return device && device.metrics.title? device.metrics.title : '';
};