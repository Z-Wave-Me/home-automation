/*** ZWaveFanModeDevice.js ****************************************************

Version: 1.0.0

-------------------------------------------------------------------------------

Author: Gregory Sitnin <sitnin@z-wave.me>

Copyright: (c) ZWave.Me, 2013

******************************************************************************/

function ZWaveFanModeDevice(id, controller, defaults, handler) {
    ZWaveFanModeDevice.super_.call(this, id, controller, handler);
    var that = this;
    that.zCommandClassId = 0x44;
    that.modes = that.assembleModes();
    that.ready = true;
    that.deviceType = 'fan';
    that.defaults = this.defaults || defaults || {};
    that.defaults = _.extend(that.defaults, {
        deviceType: 'fan'
    });
    that.defaults.metrics = _.extend(that.defaults.metrics || {}, {
        modes: that.models,
        state: that.hasOwnProperty('_dic') ? that._dic().data.on.value : '',
        currentMode: that.hasOwnProperty('_dic') ? that._dic().data.mode.value : '',
        title: 'Fan',
        icon: 'fan'
    });
}

inherits(ZWaveFanModeDevice, VirtualDevice);

_.extend(ZWaveFanModeDevice, {
    deviceTitle: function () {
        return "Fan";
    },
    bindToDatapoints: function () {
        var self = this;

        this.bindAndRemember(this._dic().data.mode, function (changeType, args) {
            // Handle only "update" and "phantom update" events
            if (0x01 != changeType && 0x40 != changeType) return;
            // Handle update event
            self.setMetricValue("currentMode", this.value);
            // Emit generic event
            self.controller.emit('zway.dataUpdate', self.zDeviceId, self.zInstanceId, self.zCommandClassId, "mode", this.value);
        });

        this.bindAndRemember(this._dic().data.on, function (changeType, args) {
            // Handle only "update" and "phantom update" events
            if (0x01 != changeType && 0x40 != changeType) return;
            // Handle update event
            self.setMetricValue("state", this.value);
            // Emit generic event
            self.controller.emit('zway.dataUpdate', self.zDeviceId, self.zInstanceId, self.zCommandClassId, "on", this.value);
        });
    },
    assembleModes: function () {
        var res = {};
        var treeData = this._dic().data;

        this._subTreeKeys().forEach(function (modeId) {
            res[modeId] = {
                id: modeId,
                title: treeData[modeId].modeName.value
            }
        });

        return res;
    },
    performCommand: function () {
        console.log("--- ZWaveFanModeDevice.performCommand processing...");

        var handled = true;

        if ("on" === command) {
            this._dic().Set(true, this.metrics.currentMode);
        } else if ("off" === command) {
            this._dic().Set(false, this.metrics.currentMode);
        } else if ("setMode" === command) {
            var _modeId = parseInt(args["mode"], 10);
            if (!isNaN(_modeId)) {
                this._dic().Set(this.metrics.state, _modeId);
            } else {
                handled = false;
                this.controller.emit("core.error", "Invalid mode id ["+_modeId+"]");
            }
        } else {
            handled = false;
        }

        return handled ? true : ZWaveFanModeDevice.super_.prototype.performCommand.call(this, command);
    }
});