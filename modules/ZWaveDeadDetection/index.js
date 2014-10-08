/*** Z-Wave Dead Detection module ********************************************************

Version: 2.0.0
-------------------------------------------------------------------------------
Author: Serguei Poltorak <ps@z-wave.me>
Copyright: (c) Z-Wave.Me, 2014

******************************************************************************/

function ZWaveDeadDetection (id, controller) {
    ZWaveDeadDetection.super_.call(this, id, controller);

    this.ZWAY_DEVICE_CHANGE_TYPES = {
        "DeviceAdded": 0x01,
        "DeviceRemoved": 0x02,
        "InstanceAdded": 0x04,
        "InstanceRemoved": 0x08,
        "CommandAdded": 0x10,
        "CommandRemoved": 0x20,
        "ZDDXSaved": 0x100,
        "EnumerateExisting": 0x200
    };


    this.ZWAY_DATA_CHANGE_TYPE = {
        "Updated": 0x01,       // Value updated or child created
        "Invalidated": 0x02,   // Value invalidated
        "Deleted": 0x03,       // Data holder deleted - callback is called last time before being deleted
        "ChildCreated": 0x04,  // New direct child node created

        // ORed flags
        "PhantomUpdate": 0x40, // Data holder updated with same value (only updateTime changed)
        "ChildEvent": 0x80     // Event from child node
    };

    this.dataBindings = [];
    this.zwayBinding = null;
}

// Module inheritance and setup

inherits(ZWaveDeadDetection, AutomationModule);

_module = ZWaveDeadDetection;


ZWaveDeadDetection.prototype.init = function (config) {
    ZWaveDeadDetection.super_.prototype.init.call(this, config);

    var self = this;

    // Bind to all future CommandClasses changes
    this.zwayBinding = zway.bind(function (type, nodeId) {
        if (type === self.ZWAY_DEVICE_CHANGE_TYPES["DeviceAdded"]) {
            self.attach(nodeId);
        }
    }, this.ZWAY_DEVICE_CHANGE_TYPES["DeviceAdded"] | this.ZWAY_DEVICE_CHANGE_TYPES["EnumerateExisting"]);
};

ZWaveDeadDetection.prototype.stop = function () {
    console.log("--- ZWaveDeadDetection.stop()");
    ZWaveDeadDetection.super_.prototype.stop.call(this);

    // releasing bindings
    this.dataUnbind(this.dataBindings);
    zway.unbind(this.zwayBinding);
};

// Module methods

ZWaveDeadDetection.prototype.attach = function(nodeId) {
    var self = this;
    this.dataBind(this.dataBindings, nodeId, "isFailed", function(type, arg) {
        if (!(type & self.ZWAY_DATA_CHANGE_TYPE["PhantomUpdate"])) {
            self.checkDevice(self, arg);
        }
    });
    this.dataBind(this.dataBindings, nodeId, "failureCount", function(type, arg) {
        if (!(type & self.ZWAY_DATA_CHANGE_TYPE["PhantomUpdate"])) {
            self.checkDevice(self, arg);
        }
    });
};

ZWaveDeadDetection.prototype.dataBind = function(dataBindings, nodeId, path, func) {
    var data = zway.devices[nodeId].data,
        pathArr = path ? path.split(".") : [];

    if (!func) {
        console.log("Function passed to dataBind is undefined");
        return;
    }

    while (pathArr.length) {
        data = data[pathArr.shift()];
        if (!data) {
            break;
        }
    }
    
    if (data) {
        dataBindings.push({
            "nodeId": nodeId,
            "path": path,
            "func": data.bind(func, nodeId, false)
        });
    } else {
        console.log("Can not find data path:", nodeId, path);
    }
};

ZWaveDeadDetection.prototype.dataUnbind = function(dataBindings) {
    dataBindings.forEach(function (item) {
        if (zway.devices[item.nodeId]) {
            var data = zway.devices[item.nodeId].data,
                pathArr = item.path ? item.path.split(".") : [];

            while (pathArr.length) {
                data = data[pathArr.shift()];
                if (!data) {
                    break;
                }
            }
            
            if (data) {
                data.unbind(item.func);
            } else {
                console.log("Can not find data path:", item.nodeId, item.instanceId, item.commandClassId, item.path);
            }
        }
    });
    dataBindings = null;
};

ZWaveDeadDetection.prototype.checkDevice = function (self, nodeId) {
    if (zway.devices[nodeId].data.isFailed.value) {
        if (zway.devices[nodeId].data.failureCount.value === 2) {
            self.controller.addNotification("error", "Connection lost to Z-Wave device ID " + nodeId.toString(10), "connection");
        }
    } else {
        self.controller.addNotification("notification", "Z-Wave device ID " + nodeId.toString(10) + " is back to life", "connection");
    }
};
