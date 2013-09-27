/*** ZWaveBasicDevice.js ******************************************************

Version: 1.0.0

-------------------------------------------------------------------------------

Author: Gregory Sitnin <sitnin@z-wave.me>

Copyright: (c) ZWave.Me, 2013

******************************************************************************/

ZWaveBasicDevice = function (id, controller) {
    ZWaveBasicDevice.super_.call(this, id, controller);

    this.deviceType = "system";
    this.zDeviceId = zway.controller.data.nodeId.value;
    this.zCommandClassId = 32;
    this.caps = ["zway", "zwayVirtual"];

	var self = this;
    this.controller.on('zway.dataUpdate', function () {
    	return self.onUpdate.apply(self, arguments);
    })
}

inherits(ZWaveBasicDevice, ZWaveDevice);

ZWaveBasicDevice.prototype.onUpdate = function (deviceId, instanceId, commandClassId, subTreeId, value, args) {
	if (deviceId != this.zDeviceId || commandClassId != 32) return;
	this.controller.emit("zway.basic", instanceId, value);
}

ZWaveBasicDevice.prototype.bindToDatapoints = function () {
	var self = this;
	var res = [];
	var node = zway.devices[this.zDeviceId];
	var instanceKeys = Object.keys(node.instances);
	var skipInstanceZero = instanceKeys.length > 1;

	console.log("--- Iterating contoller's instances...");
	instanceKeys.forEach(function (instanceId) {
		var _iid = parseInt(instanceId, 10);

		if (skipInstanceZero && _iid === 0) {
			console.log("--! Skipping instance 0 due to multiple instances exists");
			return;
		}

		var _instance = node.instances[_iid];

		if (!has_key(_instance.commandClasses, "32")) {
			console.log("--W Instance", _iid, "has no Basic comamnd class. Skipping");
			return;
		}

		console.log("--- Binding listener to the channel", _iid);
        _instance.commandClasses[self.zCommandClassId].data.level.bind(function (changeType, args) {
            // Handle only "update" and "shadow update" events
            if (0x01 != changeType && 0x41 != changeType) return;

            // Emit generic event
            self.controller.emit('zway.dataUpdate', self.zDeviceId, _iid, self.zCommandClassId, null, this.value, args);

            // Handle update event
            // self.handleDatapointUpdate(this.value, args);
        });
	});

	return res;
};
