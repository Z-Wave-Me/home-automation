// ----------------------------------------------------------------------------
// --- Switch widget
// ----------------------------------------------------------------------------
// states: on, off
// ----------------------------------------------------------------------------

function SwitchWidget (parentElement, device) {
    SwitchWidget.super_.apply(this, arguments);

    this.value = this.metrics.level;
}

inherits(SwitchWidget, AbstractWidget);

SwitchWidget.prototype.updateWidgetUI = function () {
    this.elem.innerHTML = nunjucks.env.render("CommonWidgets/switch.html", {
        vDev: this.device.id,
        widgetTitle: this.metrics["title"] || "Switch",
        metricValue: this.value
    });
}

