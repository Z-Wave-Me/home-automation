/*** ZWaveThermostatDevice.js *************************************************

Version: 1.0.0

-------------------------------------------------------------------------------

Author: Gregory Sitnin <sitnin@z-wave.me>

Copyright: (c) ZWave.Me, 2013

******************************************************************************/

ZWaveThermostatDevice = function (id, controller, zDeviceId, zInstanceId) {
    ZWaveThermostatDevice.super_.call(this, id, controller, zDeviceId, zInstanceId);

    this.deviceType = "thermostat";

    var CCs = this._di().commandClasses;

    this.sensorAvailable = Object.keys(CCs).indexOf("49") >= 0 && Object.keys(this._dic(49).data).indexOf("1") >= 0 && this._dic(49).data.interviewDone;
    this.modeAvailable = Object.keys(CCs).indexOf("64") >= 0 && this._dic(64).data.interviewDone;
    this.setPointAvailable = Object.keys(CCs).indexOf("67") >= 0 && this._dic(67).data.interviewDone;

    this.setMetricValue("hasSensor", this.sensorAvailable);
    this.setMetricValue("hasMode", this.modeAvailable);
    this.setMetricValue("hasSetPoint", this.setPointAvailable);

    this.modes = this.assembleModes();
    this.setMetricValue("modes", this.modes);
    this.setMetricValue("currentMode", this.currentMode());

    if (this.sensorAvailable) {
        this.setMetricValue("scaleTitle", this._dic(49).data[1].scaleString.value);
        this.setMetricValue("level", this.sensorValue());
    }
}

inherits(ZWaveThermostatDevice, VirtualDevice);

ZWaveThermostatDevice.prototype.deviceTitle = function () {
    return "Thermostat";
}

ZWaveThermostatDevice.prototype.currentMode = function () {
    if (this.modeAvailable) {
        return this._dic(64).data.mode.value;
    } else {
        return this._subTreeKeys(67)[0];
    }
}

ZWaveThermostatDevice.prototype.sensorValue = function () {
    return this._dic(49).data[1].val.value;
}

ZWaveThermostatDevice.prototype.assembleModes = function () {
    var self = this;
    var res = [];

    var modes = this.modeAvailable ? this._subTreeKeys(64) : [];
    var setpoints = this.setPointAvailable ? this._subTreeKeys(67) : [];

    if (this.modeAvailable) {
        modes.forEach(function (modeId) {
            var mode = self._dic(64).data[modeId];
            var sp = setpoints.indexOf(modeId) >= 0 ? self._dic(67).data[modeId] : null;
            res.push({
                id: modeId,
                title: mode.modeName.value,
                target: !!sp ? sp.val.value : null
            });
        });
    } else {
        var modeId = setpoints[0];
        var setPoint = this._dic(67).data[modeId];
        res.push({
            id: modeId,
            title: setPoint.modeName.value,
            target: setPoint.val.value
        });
    }

    return res;
}

ZWaveThermostatDevice.prototype.modeById = function (modeId) {
    for (var index in this.modes) {
        if (this.modes[index].id == modeId) {
            return index;
        }
    }

    return null;
}

ZWaveThermostatDevice.prototype.bindToDatapoints = function () {
    var self = this;

    if (this.sensorAvailable) {
        this.bindAndRemember(this._dic(49).data, function (changeType, args) {
            // Handle only "update" and "phantom update" events
            if (0x01 != changeType && 0x40 != changeType) return;
            // Handle update event
            self.setMetricValue("level", this.value);
            // Emit generic event
            self.controller.emit('zway.dataUpdate', self.zDeviceId, self.zInstanceId, self.zCommandClassId, "val", this.value);
        });
    }

    if (this.modeAvailable) {
        this.bindAndRemember(this._dic(64).data.mode, function (changeType, args) {
            // Handle only "update" and "phantom update" events
            if (0x01 != changeType && 0x40 != changeType) return;
            // Handle update event
            self.setMetricValue("currentMode", this.value);
            // Emit generic event
            self.controller.emit('zway.dataUpdate', self.zDeviceId, self.zInstanceId, self.zCommandClassId, "mode", this.value);
        });
        self._subTreeKeys(67).forEach(function (setPointId) {
            self.bindAndRemember(self._dic(67).data[setPointId], function (changeType, args) {
                // Handle only "update" and "phantom update" events
                if (0x01 != changeType && 0x40 != changeType) return;
                // Handle update event
                var _id = parseInt(this.name, 10);
                self.modes[self.modeById(_id)].target = this.val.value;
                self.setMetricValue("modes", self.modes);
                // Emit generic event
                self.controller.emit('zway.dataUpdate', self.zDeviceId, self.zInstanceId, self.zCommandClassId, "setpoint", _id, this.val.value);
            });
        });
    } else {
        self.bindAndRemember(self._dic(67).data[this._subTreeKeys(67)[0]], function (changeType, args) {
            // Handle only "update" and "phantom update" events
            if (0x01 != changeType && 0x40 != changeType) return;
            // Handle update event
            self.modes[0].target = this.val.value;
            self.setMetricValue("modes", self.modes);
            // Emit generic event
            self.controller.emit('zway.dataUpdate', self.zDeviceId, self.zInstanceId, self.zCommandClassId, "setpoint", _id, this.val.value);
        });
    }
};

ZWaveThermostatDevice.prototype.performCommand = function (command, args) {
    console.log("--- ZWaveThermostatDevice.performCommand processing...");

    var handled = true;

    if ("on" === command) {
        this._dic().Set(true, this.metrics.currentMode);
    } else if ("off" === command) {
        this._dic().Set(false, this.metrics.currentMode);
    } else if ("setMode" === command) {
        var _modeId = parseInt(args["mode"], 10);
        if (!isNaN(_modeId)) {
            this._dic(64).Set(_modeId);
            this._dic(64).Get();
        } else {
            handled = false;
            this.controller.emit("core.error", "Invalid mode id ["+_modeId+"]");
        }
    } else if ("setTarget" === command) {
        var _target = parseInt(args["target"], 10);
        if (!isNaN(_target)) {
            this._dic(67).Set(this.modes[this.modeById(this.metrics.currentMode)].id, _target);
            this._dic(67).Get();
        } else {
            handled = false;
            this.controller.emit("core.error", "Invalid target value ["+_target+"]");
        }
    } else {
        handled = false;
    }

    return handled ? true : ZWaveThermostatDevice.super_.prototype.performCommand.call(this, command);
}


ZWaveThermostatDevice.prototype.deviceIconBase = function () {
    return "thermostat";
}
