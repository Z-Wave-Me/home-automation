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

    this.elem.innerHTML = nunjucks.env.render("CommonWidgets/thermostat.html", {
        vDev: this.device.id,
        modes: this.metrics["modes"],
        currentMode: this.metrics.currentMode,
        currentModeIndex: this.currentModeIndex(),
        level: this.metrics["level"],
        scaleTitle: this.metrics["scaleTitle"],
        possibleTargets: _pT
    });
}
