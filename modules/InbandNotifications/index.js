/*** InbandNotifications Z-Way HA module *******************************************

Version: 1.1.1
(c) Z-Wave.Me, 2015
-----------------------------------------------------------------------------
Author: Niels Roche <nir@zwave.eu>
Description:
    Creates a module that listens to the status of every device in the background. 
    It sends notifications automatically if it has changed.
    Notifications are stored hourly to storage and checked once a day if they are older than one week. 
    The older ones will eb deleted
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function InbandNotifications (id, controller) {
    // Call superconstructor first (AutomationModule)
    InbandNotifications.super_.call(this, id, controller);
}

inherits(InbandNotifications, AutomationModule);

_module = InbandNotifications;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

InbandNotifications.prototype.init = function (config) {
    InbandNotifications.super_.prototype.init.call(this, config);

    var self = this,
        lastChanges = [];

    this.writeNotification = function (vDev) {
        if(!Boolean(vDev.get('permanently_hidden'))){
            var devId = vDev.get('id'),
                devType = vDev.get('deviceType'),
                devProbeType = vDev.get('probeType'),
                devName = vDev.get('metrics:title'),
                scaleUnit = vDev.get('metrics:scaleTitle'),
                lvl = vDev.get('metrics:level'),
                location = vDev.get('location'),
                customIcons = vDev.get('customIcons') !== {}? vDev.get('customIcons') : undefined,
                eventType = function(){
                    if(vDev.get('metrics:probeTitle')){
                        return vDev.get('metrics:probeTitle').toLowerCase();
                    }else {
                        return 'status';
                    }
                },
                createItem = 0,
                item, msg, msgType,
                getCustomIcon = function(){
                    return customIcons.level? customIcons.level[lvl] : customIcons.default;
                };



            if(lastChanges.filter(function(o){
                            return o.id === devId;
                                        }).length < 1){
                item = {
                        id: devId,
                        l: lvl
                    };

                lastChanges.push(item);
                createItem = 1;
            }

            for(var i = 0; i < lastChanges.length; i++){
                var cl = lastChanges[i]['l'],
                    cid = lastChanges[i]['id'];

                if(lvl === +lvl && lvl !== (lvl|0)) {
                    lvl = lvl.toFixed(1);
                }

                if((cid === devId && cl !== lvl) || (cid === devId && cl === lvl && (createItem === 1 || devType === "toggleButton" || devType === "switchControl"))){

                    // depending on device type choose the correct notification
                    switch(devType) {
                        case 'switchBinary':
                        case 'switchControl':
                        case 'sensorBinary':
                        case 'fan':
                        case 'doorlock':
                        case 'toggleButton':
                            msg = {
                                dev: devName,
                                l:lvl,
                                location: location === 0? '' : location,
                                customIcon: getCustomIcon()
                                };
                            msgType = 'device-OnOff';

                            self.controller.addNotification('device-info', msg , msgType, devId);
                            break;
                        case 'switchMultilevel':
                            msg = {
                                dev: devName,
                                l: lvl + '%',
                                location: location === 0? '' : location,
                                customIcon: getCustomIcon()
                                };
                            msgType = 'device-status';

                            self.controller.addNotification('device-info', msg , msgType, devId);
                            break;
                        case 'sensorDiscrete':
                            msg = {
                                dev: devName,
                                l: lvl,
                                location: location === 0? '' : location,
                                customIcon: getCustomIcon()
                            };
                            msgType = 'device-status';

                            self.controller.addNotification('device-info', msg , msgType, devId);
                            break;
                        case 'sensorMultilevel':
                        case 'sensorMultiline':
                        case 'thermostat':
                            if (!~devProbeType.indexOf('meterElectric_')){
                                msg = {
                                    dev: devName,
                                    l: lvl + (scaleUnit? ' ' + scaleUnit: ''),
                                    location: location === 0? '' : location,
                                    customIcon: getCustomIcon()
                                };
                                msgType = 'device-' + eventType();

                                self.controller.addNotification('device-info', msg , msgType, devId);
                            }
                            break;
                        case 'switchRGBW':
                            msg = {
                                dev: devName,
                                l: lvl,
                                color: vDev.get('metrics:color'),
                                location: location === 0? '' : location,
                                customIcon: getCustomIcon()
                                };
                            msgType = 'device-' + eventType();

                            self.controller.addNotification('device-info', msg , msgType, devId);
                            break;
                        default:
                            break;
                    }
                    lastChanges[i]['l'] = lvl;
                    createItem = 0;
                }
            }
        }     
    };

    // Setup metric update event listener
    self.controller.devices.on('change:metrics:level', self.writeNotification);
};

InbandNotifications.prototype.stop = function () {
    var self = this;       

    self.controller.devices.off('change:metrics:level', self.writeNotification);

    InbandNotifications.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------