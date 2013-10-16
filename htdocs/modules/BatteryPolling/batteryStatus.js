// BatteryStatusWidget = function (id, controller, zDeviceId, zInstanceId) {
//     ZWaveBatteryLowLevelWarningWidget.super_.call(this, id, controller, zDeviceId, zInstanceId);

//     this.deviceType = "probe";

//     var listBatteryLow = [];
//     for (var id in zway.devices) {
//         if (zway.devices[id].Battery) {
//             if (zway.devices[id].Battery.data.level.value <= this.config.warningLevel) {
//                 listBatteryLow.push(id);
//             }
//         }
//     }
//     if (listBatteryLow.length) {
//         this.setMetricValue("probeTitle", "Battery is empty in devices:" + listBatteryLow.toString());
//     } else {
//         this.setMetricValue("probeTitle", "Batteries are all OK");
//     }
// }

// inherits(ZWaveBatteryEmptyWarningWidget, ZWaveDevice);

// ZWaveBatteryEmptyWarningWidget.prototype.dataPoints = function () {
//     return [this._dics().level];
// }

function BatteryStatusWidget (parentElement, deviceId) {
    BatteryStatusWidget.super_.apply(this, arguments);

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
