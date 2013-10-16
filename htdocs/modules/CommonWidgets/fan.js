// ----------------------------------------------------------------------------
// --- Fan widget
// ----------------------------------------------------------------------------
// scales:
// ----------------------------------------------------------------------------

function FanWidget (parentElement, deviceId) {
    FanWidget.super_.apply(this, arguments);

    this.value = Math.floor(this.metrics.level * 10) / 10;
}

inherits(FanWidget, AbstractWidget);

FanWidget.prototype.updateWidgetUI = function () {
    var self = this;
    var modesArray = [];
    Object.keys(this.metrics.modes).forEach(function (key) {
        modesArray.push(self.metrics.modes[key]);
    });

    this.elem.innerHTML = nunjucks.env.render("CommonWidgets/fan.html", {
        vDev: this.device.id,
        modes: modesArray,
        widgetTitle: this.metrics["title"] || "Fan",
        currentMode: this.metrics.currentMode,
        state: this.metrics.state
    });
}

