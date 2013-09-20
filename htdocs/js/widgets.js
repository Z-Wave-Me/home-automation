// ----------------------------------------------------------------------------
// --- Abstract widget class
// ----------------------------------------------------------------------------

function AbstractWidget (parentElement, device) {
    this.parentElementId = parentElement;
    this.device = device;

    this.value = this.device.metrics.level;
    this.metrics = this.device.metrics;

    var self = this;
    events.on('device.metricUpdated', function (deviceId, name, value) {
        // console.log("--- device.metricUpdated", deviceId, name, value);
        if (self.device.id === deviceId) {
            if ("level" === name) {
                self.setValue(value);
            } else {
                self.setMetricValue(name, value);
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

AbstractWidget.prototype.setMetricValue = function (name, value, callback) {
    this.metrics[name] = value;
    this.updateWidgetUI();
    if (callback) callback(name, value);
}

AbstractWidget.prototype.updateWidgetUI = function () {
    console.log("Don't know how to update widget UI", this);
}

AbstractWidget.prototype.commandApiUri = function (command) {
    return "/devices/"+this.device.id+"/command/"+command;
}

AbstractWidget.prototype.performCommand = function (command, args) {
    apiRequest(this.commandApiUri(command), null, {
        data: args
    });
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

// ----------------------------------------------------------------------------
// --- Fan widget
// ----------------------------------------------------------------------------
// scales:
// ----------------------------------------------------------------------------

function FanWidget (parentElement, deviceId) {
    FanWidget.super_.apply(this, arguments);

    this.widgetTitle = this.device.metrics.probeTitle;

    this.value = Math.floor(this.device.metrics.level * 10) / 10;
}

inherits(FanWidget, AbstractWidget);

FanWidget.prototype.updateWidgetUI = function () {
    var self = this;
    var modesArray = [];
    Object.keys(this.metrics.modes).forEach(function (key) {
        modesArray.push(self.metrics.modes[key]);
    });

    this.elem.innerHTML = nunjucks.env.render("widgets/fan.html", {
        vDev: this.device.id,
        modes: modesArray,
        currentMode: this.metrics.currentMode,
        state: this.metrics.state
    });
}

// ----------------------------------------------------------------------------
// --- Thermostat widget
// ----------------------------------------------------------------------------
// scales:
// ----------------------------------------------------------------------------

function ThermostatWidget (parentElement, deviceId) {
    FanWidget.super_.apply(this, arguments);

    this.widgetTitle = this.device.metrics.probeTitle;

    this.value = Math.floor(this.device.metrics.level * 10) / 10;
}

inherits(ThermostatWidget, AbstractWidget);

ThermostatWidget.prototype.currentModeIndex = function () {
    for (var index in this.metrics.modes) {
        if (this.metrics.modes[index].id == this.metrics.currentMode) {
            return index;
        }
    }

    return null;
}

ThermostatWidget.prototype.updateWidgetUI = function () {
    var self = this;
    var _pT = [];
    for (var i=5; i<35; i++) _pT.push(i);

    this.elem.innerHTML = nunjucks.env.render("widgets/thermostat.html", {
        vDev: this.device.id,
        modes: this.metrics["modes"],
        currentMode: this.metrics.currentMode,
        currentModeIndex: this.currentModeIndex(),
        level: this.metrics["level"],
        scaleTitle: this.metrics["scaleTitle"],
        possibleTargets: _pT
    });
}
