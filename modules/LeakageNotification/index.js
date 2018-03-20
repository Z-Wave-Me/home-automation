/*** LeakageNotification Z-Way HA module *******************************************

Version: 1.0.5
(c) Z-Wave.Me, 2015
-----------------------------------------------------------------------------
Author: Niels Roche <nir@zwave.eu>
Description:
    Filters all water sensors and creates a virtual device to monitor and control them together.
******************************************************************************/
// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------
function LeakageNotification(id, controller) {
    // Call superconstructor first (AutomationModule)
    LeakageNotification.super_.call(this, id, controller);
}

inherits(LeakageNotification, AutomationModule);

_module = LeakageNotification;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

LeakageNotification.prototype.init = function(config) {
    LeakageNotification.super_.prototype.init.call(this, config);

    var self = this,
        filteredSensorsFromDevices = [],
        waterSensorMetrics = [],
        item = {},
        langFile = self.controller.loadModuleLang('LeakageNotification');

    this.vDev = null;

    // update vDev attributes (water sensors)
    this.updateAttributes = function(dev) {
        var waterSensors = [],
            sensor = [],
            indx = null;

        waterSensors = self.vDev.get('metrics:sensors');

        sensor = waterSensors.filter(function(sensor) {
            return sensor.id === dev.get('id');
        });

        if (sensor[0]) {
            // update sensor metrics
            sensor[0].metrics = dev.get('metrics');
        }
    };

    // add sensors to vDev (after server startup)
    this.updateIfWaterSensorsAreCreated = function(dev) {
        var indx = self.config.sensors.indexOf(dev.id);

        if (indx > -1 && waterSensorMetrics.map(function(e) {
                return e.id;
            }).indexOf(dev.id) === -1) {

            if (filteredSensorsFromDevices.indexOf(dev) === -1) {
                filteredSensorsFromDevices.push(dev);
            }

            item = {
                id: dev.id,
                deviceType: dev.get('deviceType'),
                metrics: dev.get('metrics'),
                hasHistory: dev.get('hasHistory'),
                updateTime: dev.get('updateTime')
            };

            waterSensorMetrics.push(item);

            // listen to sensor changes
            self.controller.devices.on(dev.id, 'change:[object Object]', self.updateAttributes);

            // setup arm mode (reinitialize vDev)
            if (self.vDev.get('metrics:state') === 'armed') {
                if (dev.get('metrics:level') === 'on') {
                    self.setAlert();
                }

                // listen to sensor changes
                self.controller.devices.on(dev.id, 'change:metrics:level', self.throwAlert);
            }
        }
    };

    // activate armed modus
    this.setupArmed = function() {
        // if it is still alert set alert mode 
        if (self.getSensorLevels().length > 0 && self.getSensorLevels().indexOf('on') !== -1) {
            self.setAlert();
        } else {
            self.vDev.set('metrics:level', 'OK');
            self.vDev.set('metrics:icon', '/ZAutomation/api/v1/load/modulemedia/LeakageNotification/ok.png');
        }

        // listen to sensor changes
        filteredSensorsFromDevices.forEach(function(dev) {
            self.controller.devices.on(dev.id, 'change:metrics:level', self.throwAlert);
        });
    };

    // listener - what to do if sensors state has changed 
    this.throwAlert = function(dev) {

        //set alert mode
        if (dev.get('metrics:level') === 'on' && self.vDev.get('metrics:level') !== 'ALERT') {
            self.setAlert();
        }

        //set back armed mode if alert is OK and device is not disarmed
        if (dev.get('metrics:level') === 'off' &&
            self.vDev.get('metrics:level') === 'ALERT' &&
            self.getSensorLevels().length > 0 &&
            self.getSensorLevels().indexOf('on') === -1 &&
            self.vDev.get('metrics:state') !== 'disarmed') {

            self.vDev.set('metrics:level', 'OK!');
            self.vDev.set('metrics:icon', '/ZAutomation/api/v1/load/modulemedia/LeakageNotification/warning.png');

            //send notification: OK
            console.log('Leakage Protection state is "OK". Still armed ...');
            //stop sending notifications
            console.log('Stop sending notifications ...');

            self.triggerNotification(langFile.abort_sending_msg? langFile.abort_sending_msg : undefined);

            if (self.sendInterval) {
                console.log('Stop - Clear send ...');
                clearInterval(self.sendInterval);
                self.sendInterval = undefined;
            }
        }
    };

    // set vDev to alert mode
    this.setAlert = function() {
        self.vDev.set('metrics:level', 'ALERT');
        self.vDev.set('metrics:icon', '/ZAutomation/api/v1/load/modulemedia/LeakageNotification/alarm.png');

        // trigger reaction
        self.reactOnAlert();

        //start sending notifications
        console.log('Alert detected. Start sending notifications ...');

        if (!this.sendInterval) {
            self.triggerNotification();
            this.sendInterval = setInterval( function () {
                console.log('Send ...');
                self.triggerNotification();
            }, parseInt(config.notification.interval, 10) * 1000);
        }
    };

    this.triggerNotification = function(msg) {
        _.forEach(config.notification.notifiers, function(obj){
            var vDev = self.controller.devices.get(obj.notifier),
                message = msg? msg : (obj.message? obj.message : '');

            if (vDev) {

                // set message to send
                vDev.set('metrics:message', message, {silent: true});
                // send notification
                vDev.performCommand('on');
                // clear message
                vDev.set('metrics:message', '', {silent: true});
            } 
        });
    };

    // listener - set vDev level back to OK if device is disarmed and sensor levels are all 'off'
    this.onPoll = function() {
        if (self.getSensorLevels().indexOf('on') === -1 && self.vDev) {
            self.vDev.set('metrics:level','OK');
            self.vDev.set('metrics:icon', '/ZAutomation/api/v1/load/modulemedia/LeakageNotification/ok.png');
            self.removePolling();
        }
    };

    // remove polling after disarm and sensor levels are ok
    this.removePolling = function() {
         
        if (this.timer) {
            console.log('Clear check ...');
            clearInterval(this.timer);
            this.timer = undefined;
        }

        if (this.sendInterval) {
            console.log('Clear send ...');
            clearInterval(this.sendInterval);
            this.sendInterval = undefined;
        }
    };

    // do configured action if alert is triggered
    this.reactOnAlert = function() {

        _.forEach(self.config.action, function(actor) {
            var type = actor.filter,
                configDev = actor[type],
                targetDev = self.controller.devices.get(configDev.device);

            if (targetDev) {
                if (type === 'switchMultilevel') {
                    if (configDev.status === 'lvl') {
                        targetDev.performCommand("exact", {
                            level: configDev.level
                        });
                    } else {
                        targetDev.performCommand(configDev.status);
                    }
                } else if (targetDev.get("deviceType") === "toggleButton" && type === "scene") {
                    targetDev.performCommand("on");
                } else {
                    targetDev.performCommand(configDev.status);
                }
            }
        });
    };

    this.checkState = function() {
        if (!this.timer) {
            this.timer = setInterval( function () {
                console.log('Do check ...');
                self.onPoll();
            }, 10 * 1000);
        }
    };

    // get sensors from devices
    filteredSensorsFromDevices = self.controller.devices.filter(function(dev) {
        return self.config.sensors.indexOf(dev.id) > -1;
    });

    // create vDev metrics with sensor values
    filteredSensorsFromDevices.forEach(function(dev) {

        item = {
            id: dev.id,
            deviceType: dev.get('deviceType'),
            metrics: dev.get('metrics'),
            hasHistory: dev.get('hasHistory'),
            updateTime: dev.get('updateTime')
        };

        waterSensorMetrics.push(item);

        // listen to sensor changes
        self.controller.devices.on(dev.id, 'change:[object Object]', self.updateAttributes);
    });

    var metr = this.controller.vdevInfo["LeakageNotification_" + this.id] && this.controller.vdevInfo["LeakageNotification_" + this.id].metrics? this.controller.vdevInfo["LeakageNotification_" + this.id].metrics : null;

    // create vDev
    this.vDev = self.controller.devices.create({
        deviceId: "LeakageNotification_" + this.id,
        defaults: {
            deviceType: 'sensorMultiline',
            metrics: {
                multilineType: 'protection',
                title: self.getInstanceTitle(this.id),
                icon: '/ZAutomation/api/v1/load/modulemedia/LeakageNotification/ok.png',
                level: !!metr && metr.level? metr.level : 'OK',
                state: !!metr && metr.state? metr.state :'disarmed'
            }
        },
        overlay: {
            metrics: {
                title: self.getInstanceTitle(this.id),
                sensors: waterSensorMetrics
            }
        },
        handler: function(command) {
            var cutDevId = [],
                cutIdNumbers = [],
                nodId = [];
            // arm
            if (command === 'arm' && waterSensorMetrics.length > 0) {
                // set vDev state to armed
                self.vDev.set('metrics:state', 'armed');

                // remove polling
                self.removePolling();

                // set up arm mode
                self.setupArmed();
            }
            // disarm
            if (command === 'disarm' && waterSensorMetrics.length > 0) {
                // set vDev state to disarmed
                self.vDev.set('metrics:state', 'disarmed');

                // set up cron handler checking for alert
                if (self.getSensorLevels().indexOf('on') !== -1) {

                    self.checkState();
                } else {
                    self.vDev.set('metrics:level', 'OK');
                    self.vDev.set('metrics:icon', '/ZAutomation/api/v1/load/modulemedia/LeakageNotification/ok.png');
                }

                //stop sending notifications
                console.log('Disarmed. Stop sending notifications ...');
                
                self.triggerNotification(langFile.disarmed? langFile.disarmed : undefined);
                
                if (self.sendInterval) {
                    console.log('Disarmed - Clear send ...');
                    clearInterval(self.sendInterval);
                    self.sendInterval = undefined;
                }

                // remove listener of sensor changes
                filteredSensorsFromDevices.forEach(function(dev) {
                    self.controller.devices.off(dev.id, 'change:metrics:level', self.throwAlert);
                });

                //if ALERT send basic off to each water detector
                if (self.vDev.get('metrics:level') === 'ALERT') {
                    //get correct node id
                    self.config.sensors.forEach(function(id) {
                        cutDevId = id.split('_');
                        cutIdNumbers = cutDevId[2].split('-');
                        
                        if (nodId.indexOf(cutIdNumbers[0]) === -1) {
                            nodId.push(cutIdNumbers[0]);
                        }
                    });

                    nodId.forEach(function(node) {
                        // send via z-way api
                        if (zway.devices[node].instances[0].commandClasses[32]) {
                            zway.devices[node].instances[0].commandClasses[32].Set(0);
                        }
                    });
                }
            }

            //update
            if (command === 'update' && waterSensorMetrics.length > 0) {
                filteredSensorsFromDevices.forEach(function(sensor) {
                    try {
                        sensor.performCommand('update');
                    } catch (e) {
                        self.controller.addNotification('device-info', 'Update has failed. Error:' + e, 'device-status', sensor.id);
                    }
                });
            }
        },
        moduleId: this.id
    });

    // setup arm mode (reinitialize vDev)
    if (self.vDev.get('metrics:state') === 'armed') {
        self.setupArmed();
    }

    // refresh/create virtual device if sensors are created (after restart)
    self.controller.devices.on('created', self.updateIfWaterSensorsAreCreated);
};

LeakageNotification.prototype.stop = function() {
    var self = this;

    if (this.vDev) {
        this.controller.devices.remove(this.vDev.id);
        this.vDev = null;
    }

    this.controller.devices.filter(function(dev) {
        return self.config.sensors.indexOf(dev.id) > -1;
    }).forEach(function(dev) {
        self.controller.devices.off(dev.id, 'change:[object Object]', self.updateAttributes);
        self.controller.devices.off(dev.id, 'change:metrics:level', self.throwAlert);
    });

    this.controller.devices.off('created', self.updateIfWaterSensorsAreCreated);

    // remove polling
    this.removePolling();

    LeakageNotification.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

LeakageNotification.prototype.getInstanceTitle = function(instanceId) {
    var instanceTitle = this.controller.instances.filter(function(instance) {
        return instance.id === instanceId;
    });

    return instanceTitle[0] && instanceTitle[0].title ? instanceTitle[0].title : 'Leakage Protection ' + this.id;
};

LeakageNotification.prototype.getSensorLevels = function() {
    var self = this;

    return self.vDev.get('metrics:sensors').map(function(sensor) {
        return sensor.metrics.level;
    });
};