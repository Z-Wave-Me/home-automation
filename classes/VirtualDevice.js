/*** Z-Way HA Virtual Device base class ***************************************

Version: 1.0.0
-------------------------------------------------------------------------------
Author: Gregory Sitnin <sitnin@z-wave.me>
Copyright: (c) ZWave.Me, 2013

******************************************************************************/

VirtualDevice = function (id, controller) {
    this.id = id;
    this.controller = controller;
    this.deviceType = null;
    this.deviceSubType = null;
    this.metrics = {};
    this.caps = [];
    this.tags = [];
    this.widgetClass = null;

    this.metrics["iconBase"] = "unknown";

    this.updateFromVdevInfo();
    if (!this.getMetricValue("title")) {
        this.setMetricValue("title", this.defaultDeviceTitle());
    }
};

VirtualDevice.prototype.defaultDeviceTitle = function () {
    return this.id;
};

VirtualDevice.prototype.setMetricValue = function (name, value) {
    this.metrics[name] = value;
    this.controller.emit("device.metricUpdated", this.id, name, value);
};

VirtualDevice.prototype.getMetricValue = function (name) {
    return this.metrics[name];
};

VirtualDevice.prototype.performCommand = function (command) {
    return false;
};

VirtualDevice.prototype.updateFromVdevInfo = function () {
    var self = this;

    var info = this.controller.getVdevInfo(this.id);
    if (!!info) {
        // update title
        if (info.title) {
            this.setMetricValue("title", info.title);
        }

        // update tags list
        if (info.tags && Array.isArray(info.tags)) {
            info.tags.forEach(function (tag) {
                if (!in_array(self.tags, tag)) {
                    self.tags.push(tag);
                }
            });
            this.controller.emit("device.tagsUpdated", this.id, this.tags);
        }
    }
};
