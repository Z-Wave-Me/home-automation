// ----------------------------------------------------------------------------
// --- Prototypal inheritance support routine (from Node.JS)
// ----------------------------------------------------------------------------

function inherits (ctor, superCtor) {
    ctor.super_ = superCtor;
    ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
            value: ctor,
            enumerable: false,
            writable: true,
            configurable: true
        }
    });
}

// ----------------------------------------------------------------------------
// --- Abstract widget class
// ----------------------------------------------------------------------------

function AbstractWidget (parentElement, device) {
    this.parentElementId = parentElement;
    this.device = device;

    this.value = this.device.metrics.level;
}

AbstractWidget.prototype.init = function () {
    var parent = document.getElementById(this.parentElementId);
    this.elem = document.createElement("div");
    this.elem.classList.add('dashboardWidgetSmall');
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
    this.elem.innerHTML = this.widgetTitle + ": " + (255 === this.value ? "On" : "Off");
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
        valueString = this.value + "%";
    }

    this.elem.innerHTML = this.widgetTitle + ": " + valueString;
}

// ----------------------------------------------------------------------------
// --- Probe widget
// ----------------------------------------------------------------------------
// states:
//     true: Triggered
//     false: Not triggered
// commands:
//     enter: Update value
// ----------------------------------------------------------------------------

function ProbeWidget (parentElement, deviceId) {
    ProbeWidget.super_.apply(this, arguments);

    this.widgetTitle = this.device.metrics.probeTitle + " probe";

    this.value = Math.floor(this.device.metrics.level * 10) / 10;
}

inherits(ProbeWidget, AbstractWidget);

ProbeWidget.prototype.updateWidgetUI = function () {
    this.elem.innerHTML = this.widgetTitle + ": " + this.value + " " + this.device.metrics.scaleTitle;
}
