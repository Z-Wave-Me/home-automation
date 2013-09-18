// ----------------------------------------------------------------------------
// --- Abstract widget class
// ----------------------------------------------------------------------------

function AbstractWidget (parentElement, device) {
    this.parentElementId = parentElement;
    this.device = device;

    this.value = this.device.metrics.level;

    var self = this;
    events.on('device.metricUpdated', function (deviceId, name, value) {
        // console.log("--- device.metricUpdated", deviceId, name, value);
        if (self.device.id === deviceId) {
            if ("level" === name) {
                self.setValue(value);
            } else {
                // console.log("Don't know how to handle", name, "metric update. Ignoring.");
            }
        }
    });

}

AbstractWidget.prototype.init = function () {
    var parent = document.getElementById(this.parentElementId);
    this.elem = document.createElement("div");
    parent.appendChild(this.elem);
    this.updateWidgetUI();
};

AbstractWidget.prototype.setValue = function (value, callback) {
    this.value = value;
    this.updateWidgetUI();
    if (callback) callback(value);
}

AbstractWidget.prototype.updateWidgetUI = function () {
    console.log("Don't know how to update widget UI", this);
}

AbstractWidget.prototype.commandApiUri = function (command) {
    return "/devices/"+this.device.id+"/command/"+command;
}

AbstractWidget.prototype.performCommand = function (command) {
    apiRequest(this.commandApiUri(command));
}

// ----------------------------------------------------------------------------
// --- Switch widget
// ----------------------------------------------------------------------------
// states: on, off
// ----------------------------------------------------------------------------

function SwitchWidget (parentElement, device) {
    SwitchWidget.super_.apply(this, arguments);

    this.widgetTitle = "Switch";

    this.value = this.device.metrics.level;
}

inherits(SwitchWidget, AbstractWidget);

SwitchWidget.prototype.updateWidgetUI = function () {
    // this.elem.innerHTML = "<div class=well>" + this.widgetTitle + ": " + (255 === this.value ? "On" : "Off") + "</div>";
    this.elem.innerHTML = nunjucks.env.render("widgets/switch.html", {
        vDev: this.device.id,
        widgetTitle: this.widgetTitle,
        metricValue: this.value
    });
}

// ----------------------------------------------------------------------------
// --- Multilevel widget
// ----------------------------------------------------------------------------
// states: 0-99 %
// ----------------------------------------------------------------------------

function MultilevelWidget (parentElement, deviceId) {
    MultilevelWidget.super_.apply(this, arguments);

    this.widgetTitle = "Dimmer";
}

inherits(MultilevelWidget, AbstractWidget);

MultilevelWidget.prototype.updateWidgetUI = function () {
    var valueString="";

    if (this.value >= 99) {
        valueString = "Full"
    } else if (0 === this.value) {
        valueString = "Off"
    } else {
        valueString = Math.round(this.value) + "%";
    }

    // this.elem.innerHTML = "<div class=well>" + this.widgetTitle + ": " + valueString + "</div>";
    this.elem.innerHTML = nunjucks.env.render("widgets/multilevel.html", {
        vDev: this.device.id,
        widgetTitle: this.widgetTitle,
        metricValue: this.value
    });
}

// ----------------------------------------------------------------------------
// --- Probe widget
// ----------------------------------------------------------------------------
// scales:
// ----------------------------------------------------------------------------

function ProbeWidget (parentElement, deviceId) {
    ProbeWidget.super_.apply(this, arguments);

    this.widgetTitle = this.device.metrics.probeTitle;

    this.value = Math.floor(this.device.metrics.level * 10) / 10;
}

inherits(ProbeWidget, AbstractWidget);

ProbeWidget.prototype.setValue = function (value, callback) {
    this.value = Math.floor(value * 10) / 10;
    this.updateWidgetUI();
    if (callback) callback(value);
}

ProbeWidget.prototype.updateWidgetUI = function () {
    // this.elem.innerHTML = "<div class=well>" + this.widgetTitle + ": " + this.value + " " + this.device.metrics.scaleTitle  + "</div>";
    this.elem.innerHTML = nunjucks.env.render("widgets/probe.html", {
        vDev: this.device.id,
        widgetTitle: this.widgetTitle,
        scaleTitle: this.device.metrics.scaleTitle,
        metricValue: this.value
    });
}

// ----------------------------------------------------------------------------
// --- Sensor widget
// ----------------------------------------------------------------------------
// scales:
// ----------------------------------------------------------------------------

function SensorWidget (parentElement, deviceId) {
    SensorWidget.super_.apply(this, arguments);

    this.widgetTitle = this.device.metrics.probeTitle;

    this.value = Math.floor(this.device.metrics.level * 10) / 10;
}

inherits(SensorWidget, AbstractWidget);

SensorWidget.prototype.setValue = function (value, callback) {
    this.value = !!value;
    this.updateWidgetUI();
    if (callback) callback(value);
}

SensorWidget.prototype.updateWidgetUI = function () {
    this.elem.innerHTML = nunjucks.env.render("widgets/sensor.html", {
        vDev: this.device.id,
        widgetTitle: this.widgetTitle,
        metricValue: this.value
    });
}
