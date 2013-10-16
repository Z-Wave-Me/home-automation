// ----------------------------------------------------------------------------
// --- BatteryStatusWidget
// ----------------------------------------------------------------------------

function BatteryStatusWidget (parentElement, deviceId) {
    BatteryStatusWidget.super_.apply(this, arguments);
}

inherits(BatteryStatusWidget, AbstractWidget);

BatteryStatusWidget.prototype.updateWidgetUI = function () {
    console.log("BatteryStatusWidget.updateWidgetUI() triggered");
    this.elem.innerHTML = nunjucks.env.render("BatteryPolling/batteryStatus.html", {
        vDev: this.device.id,
        widgetTitle: this.widgetTitle,
        reports: this.metrics.reports
    });
}
