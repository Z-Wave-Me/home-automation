/*** DeviceHistory Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2015
-----------------------------------------------------------------------------
Author: Niels Roche <nir@zwave.eu>
Description:
    Creates a module that stores 24h data of specific devices.
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function DeviceHistory (id, controller) {
    // Call superconstructor first (AutomationModule)
    DeviceHistory.super_.call(this, id, controller);
}

inherits(DeviceHistory, AutomationModule);

_module = DeviceHistory;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

DeviceHistory.prototype.init = function (config) {
    DeviceHistory.super_.prototype.init.call(this, config);

    var self = this,
        allDevices = self.controller.devices;

    allDevices.forEach(function(dev) {
        var devType = dev.get('deviceType');
        
        switch(devType){
            case 'sensorMultilevel':
            case 'sensorMultiline':
                self.setHistoryMultilevel(dev, devType, 30, 244);
                break;
            case 'battery':
                self.setHistoryMultilevel(dev, devType, 60, 12);
                break;
            case 'switchBinary':
            case 'sensorBinary':
                self.controller.devices.on(dev.id,'change:metrics:level', self.setHistoryBinary);
                break;
            case 'doorlock':
                break;
            case 'switchMultilevel':
                break;
            case 'thermostat':
            case 'fan':
                break;
            case 'switchControl':
                break;
            case 'toggleButton':
                break;
            default:
                break;
        }
    });
};

DeviceHistory.prototype.stop = function () {
    var self = this,
        allDevices = self.controller.devices;

    if (this.timer){
        clearInterval(this.timer);
    }

    allDevices.forEach(function(dev) {
        var devType = dev.get('deviceType');
        
        if(devType === 'switchBinary' || devType === 'sensorBinary'){
                self.controller.devices.off(dev.id,'change:metrics:level', self.setHistoryBinary);
        }
    });

    DeviceHistory.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
DeviceHistory.prototype.setHistoryBinary = function(dev){
        var self = this,
            id = dev.get('id'),
            devType = dev.get('deviceType'),
            date = new Date(),
            item, change, histMetr, firstEntry, lastEntry;

        try {

            history = DeviceHistory.prototype.loadHistory(id) || [];

        } catch (e) {
            console.log("Error loading history.json of device id '" + id + "' :", e.message);
        }

        if(history.length < 1){
            item = {
                    "id": id,
                    "dT": dev.get("deviceType"),
                    "mH": []
                };
            history.push(item);
        }   
            
        histMetr = history[0]['mH'];

        lastEntry = date.getTime() /1000;

        if(histMetr.length > 0){
            firstEntry = new Date(histMetr[0]['t']).getTime() /1000;
        }else{
            firstEntry = lastEntry;
        }
        
        if(dev.get("metrics:level") === "off" && devType === 'switchBinary'){
            change = {
                "t": date.toISOString(),
                "l": "off"
            };
        } 

        if (dev.get("metrics:level") === "on"){
            change = {
                "t": date.toISOString(),
                "l": "on"
            };
        }
        
        /*
        if(histMetr.length < 12){
            histMetr.push(change);    
        }else {
            histMetr.shift();
            histMetr.push(change);
        }
        */
    
        if(change != null){    
            if(lastEntry - (24*3600) < firstEntry){
                histMetr.push(change);    
            } else {
                histMetr.shift();
                histMetr.push(change);
            }            
            
            DeviceHistory.prototype.saveHistory(id,history);
        }
};

DeviceHistory.prototype.setHistoryMultilevel = function(dev, devType, seconds, count){
    var self = this,
        filteredDev = [];

    this.timer = setInterval(function() {
        
        if(filteredDev.indexOf(devType) === -1){
            filteredDev.push(dev);
        }

        filteredDev.forEach(function(d){
            self.storeData(d, count);
        });

    }, seconds*1000);
};

DeviceHistory.prototype.storeData = function(dev, count) {
            
    var self = this,
        id = dev.get('id'),
        item, change, device, histMetr;

    try {

        history = self.loadHistory(id) || [];

    } catch (e) {
        console.log("Error loading history.json of device id '" + id + "' :", e.message);
    }

    device = this.controller.devices.get(id);

    if(history.length < 1){
        item = {
                "id": id,
                "dT": device.get("deviceType"),
                "mH": []
            };

        history.push(item);
    }

    histMetr = history[0]['mH'];

    change = {
        "t": new Date().toISOString(),
        "l": device.get("metrics:level")
    };

    if(histMetr.length < count){
        histMetr.push(change);    
    } else {
        histMetr.shift();
        histMetr.push(change);
    }

    self.saveHistory(id,history);      
};

DeviceHistory.prototype.saveHistory = function (id,object) {
    saveObject(id + "history.json", object);
};

DeviceHistory.prototype.loadHistory = function (id) {
    return loadObject(id + "history.json");
};