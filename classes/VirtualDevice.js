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
    this.metrics = {};
    this.tags = [];
    this.location = null;
    this.updateTime = 0;
};


VirtualDevice.prototype.init = function () {
    console.log("--- VDev init(" + this.id + ")");

    this.metrics.title = this.deviceTitle();
    this.metrics.iconBase = this.deviceIconBase();

    this.updateFromVdevInfo();
};

VirtualDevice.prototype.destroy = function () {
    console.log("--- VDev destroy(" + this.id + ")");
};

VirtualDevice.prototype.deviceTitle = function () {
    return this.id;
};

VirtualDevice.prototype.deviceIconBase = function () {
    return this.metrics.iconBase = this.deviceType;
};

VirtualDevice.prototype.setMetricValue = function (name, value) {
    this.updateTime = Math.floor(new Date().getTime() / 1000);
    this.metrics[name] = value;
    this.controller.emit("device.metricUpdated", this.id, name, value);
};

VirtualDevice.prototype.setVDevObject = function (id, object) {
    var excludeProp = ['deviceType', 'updateTime', 'id'],
        self = this,
        data = object.hasOwnProperty('data') ? object.data : object;

    this.updateTime = Math.floor(new Date().getTime() / 1000);
    Object.keys(data).forEach(function (key) {
        if (excludeProp.indexOf(key) === -1 && self.hasOwnProperty(key)) {
            self[key] = data[key];
            self.controller.emit("device.valueUpdate", self.id, key, self[key]);
        }
    });

    console.log(JSON.stringify(object));
    console.log(JSON.stringify(this.metrics));

    this.controller.saveConfig();
};

VirtualDevice.prototype.getMetricValue = function (name) {
    return this.metrics[name];
};

VirtualDevice.prototype.performCommand = function (command) {
    return false;
};

VirtualDevice.prototype.addTag = function (tag) {
    var info = this.controller.getVdevInfo(this.id);
    if (this.tags.indexOf(tag) === -1) {
        this.tags.push(tag);

        if (!info.hasOwnProperty("tags")) {
            info.tags = [];
        }
        info.tags.push(tag);

        this.controller.saveConfig();
    }
};

VirtualDevice.prototype.removeTag = function (tag) {
    var info = this.controller.getVdevInfo(this.id);
    var pos = this.tags.indexOf(tag);
    if (pos >= 0) {
        this.tags.splice(pos, 1);
        this.tags = this.tags.filter(function (item) { return item !== null});

        if (!info.hasOwnProperty("tags")) {
            info["tags"] = [];
        }
        info["tags"] = this.tags;
        this.controller.saveConfig();
    }
};

VirtualDevice.prototype.updateFromVdevInfo = function () {
    var self = this;

    var info = this.controller.getVdevInfo(this.id);
    if (!!info) {
        Object.keys(info).forEach(function (key) {
            var value = info[key];
            if ("tags" === key) {
                if (Array.isArray(value)) {
                    value.forEach(function (tag) {
                        if (!in_array(self.tags, tag)) {
                            self.tags.push(tag);
                        }
                    });
                } else {
                    value.toString().split(",").forEach(function (tag) {
                        var _tag = tag.trim();
                        if (_tag.length > 0) {
                            if (!in_array(self.tags, _tag)) {
                                self.tags.push(_tag);
                            }
                        }
                    });
                }
                console.log("--! Device", self.id, "tags is:", JSON.stringify(self.tags));
                self.controller.emit("device.tagsUpdated", self.id, self.tags);
            } else if ("location" === key) {
                var unchanged = false;
                if (value !== null) {
                    if (self.controller.locations.hasOwnProperty(value)) {
                        self.location = value;
                    } else {
                        unchanged = true;
                        self.controller.emit("core.error", "Can't set location "+value+" to the device "+self.id+" -- location doesn't exist");
                    }

                } else {
                    self.location = null;
                }

                if (!unchanged) {
                    console.log("--! Device", self.id, "location is:", self.location);
                    self.controller.emit("device.locationUpdated", self.id, self.location);
                }
            } else {
                self.setMetricValue(key, info[key]);
            }
        });
    }
};
