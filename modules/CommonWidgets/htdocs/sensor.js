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
    this.elem.innerHTML = nunjucks.env.render("CommonWidgets/sensor.html", {
        vDev: this.device.id,
        widgetTitle: this.widgetTitle,
        metricValue: this.value
    });
}

