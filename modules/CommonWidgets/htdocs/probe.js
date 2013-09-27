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
    this.elem.innerHTML = nunjucks.env.render("CommonWidgets/probe.html", {
        vDev: this.device.id,
        widgetTitle: this.widgetTitle,
        scaleTitle: this.device.metrics.scaleTitle,
        metricValue: this.value
    });
}

