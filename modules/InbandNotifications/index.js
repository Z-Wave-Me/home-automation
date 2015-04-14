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

    // add cron schedule every day
    this.controller.emit("cron.addTask", "inbandNotifier.poll", {
        minute: [0,59,2],
        hour: null,
        //weekDay: [0,6,1],
        weekDay: null,
        day: null,
        month: null
    });

    var self = this,
        lastChanges = [];

    this.writeNotification = function (vDev) {
        var devId = vDev.get('id'),
            devType = vDev.get('deviceType'),
            eventType = function(){
                if(vDev.get('metrics:probeTitle')){
                    return vDev.get('metrics:probeTitle').toLowerCase();
                }else {
                    return 'status';
                }
            },
            scaleUnit = vDev.get('metrics:scaleTitle'),
            lvl = vDev.get('metrics:level'),
            createItem = 0,
            item, msg, msgType;

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

            if((cid === devId && cl !== lvl) || (cid === devId && cl === lvl && createItem === 1)){

                // depending on device type choose the correct notification
                switch(devType) {
                    case 'switchBinary':
                    case 'switchControl':
                    case 'sensorBinary':
                    case 'fan':
                    case 'doorlock':
                        msg =  lvl;
                        msgType = "device-OnOff";
                        break;
                    case 'switchMultilevel':
                    case 'battery':
                        msg = lvl + '%';
                        msgType = "device-status";
                        break;
                    case 'sensorMultilevel':
                    case 'sensorMultiline':
                    case 'thermostat':
                        msg = lvl + ' ' + scaleUnit;
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
    };

    this.onPoll = function () {
        
        var now = new Date();
        var startOfDay = now.setHours(0,0,0,0);
        var ts = Math.floor(startOfDay/ 1000);
        var tsSevenDaysBefore = ts - 86400*6;

        /*
        var now = new Date(),
            ts = (now / 1000) - 1200;
        */
        
        self.controller.deleteNotifications(tsSevenDaysBefore, true, this.onPoll, true);
        //self.controller.deleteNotifications(ts, true, this.onPoll, true);
    };

    // Setup metric update event listener
    self.controller.devices.on('change:metrics:level', self.writeNotification);
    this.controller.on("inbandNotifier.poll", this.onPoll);

};

InbandNotifications.prototype.stop = function () {
    var self = this;

    self.controller.devices.off('change:metrics:level', self.writeNotification);
    this.controller.emit("cron.removeTask", "inbandNotifier.poll");
    this.controller.off("inbandNotifier.poll", this.onPoll);

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