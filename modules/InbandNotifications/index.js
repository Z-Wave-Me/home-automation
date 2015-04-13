/*** InbandNotifications Z-Way HA module *******************************************

Version: 1.0.2
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
        var devId = vDev.get('id'),
            devType = vDev.get('deviceType'),
            devName = vDev.get('metrics:title'),
            eventType = function(){
                if(vDev.get('metrics:probeTitle')){
                    return vDev.get('metrics:probeTitle').toLowerCase();
                }else {
                    return 'status';
                }
            },
            scaleUnit = vDev.get('metrics:scaleTitle'),
            lvl = vDev.get('metrics:level'),
            lF = self.controller.loadModuleLang("InbandNotifications"),
            createItem = 0,
            item, type, msg, msgType, preMsg;

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

            if(typeof lvl === 'number') {
                lvl.toFixed(1);
            }

            if((cid === devId && cl !== lvl) || (cid === devId && cl === lvl && createItem === 1)){

                preMsg = lF[devType] + '"' + devName + '" ' + lF.change;
                // depending on device type choose the correct notification
                switch(devType) {
                    case 'switchBinary':
                    case 'switchControl':
                    case 'sensorBinary':
                    case 'fan':
                    case 'doorlock':
                        msg =  preMsg + '"' + lvl + '"';
                        msgType = "device-OnOff";
                        break;
                    case 'switchMultilevel':
                    case 'battery':
                        msg = preMsg + '"' + lvl + '%"';
                        msgType = "device-status";
                        break;
                    case 'sensorMultilevel':
                    case 'sensorMultiline':
                    case 'thermostat':
                        msg = preMsg + ': "' + lvl + ' ' + scaleUnit + '"';
                        msgType = 'device-' + eventType();
                        break;
                    default:
                        break;
                }

                self.controller.addNotification('device-info', msg , msgType, devId);
                lastChanges[i]['l'] = lvl;
                createItem = 0;
            }
        }
        var since = Math.floor(new Date().getTime() / 1000);

        var filteredNotifications = self.controller.notifications.filter(function (notification) {
            return notification.id <= (since - 7200);
            //return notification.id <= 1424866671;
        });

        //console.log(filteredNotifications);
        if(filteredNotifications.length > 0){
            self.controller.deleteNotifications(filteredNotifications, 'function', true);
        }
        
    };
   
    // Setup metric update event listener
    self.controller.devices.on('change:metrics:level', self.writeNotification);
/*
    var fN = this.notifications.filter(function (notification) {
            return notification.id <= (since- 1209600);
        });
    
    self.controller.removeNotification(fN);
    */
};

InbandNotifications.prototype.stop = function () {
    var self = this;

    self.controller.devices.off('change:metrics:level', self.writeNotification);

    InbandNotifications.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

InbandNotifications.prototype.deviceCollector = function(deviceType){
    var allDevices = this.controller.devices,
        filteredDevices = [];
    
    if(deviceType === 'all'){
        return allDevices;
    } else {   
        
        filteredDevices = allDevices.filter(function (vDev){
            return vDev.get('deviceType') === deviceType;
        });        

        return filteredDevices;  
    }      
};