VirtualDevice = function (id, controller) {
    this.id = id;
    this.controller = controller;
    this.metrics = {};
}

VirtualDevice.prototype.setMetricValue = function (name, value) {
    this.metrics[name] = value;
    this.controller.emit("metricUpdate."+this.id, name, value);
}

VirtualDevice.prototype.performCommand = function (command) {
    console.log("--- VirtaulDevice.performCommand", command);
    return false;
}
