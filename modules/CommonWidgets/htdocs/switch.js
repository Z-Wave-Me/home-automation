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
    this.elem.innerHTML = nunjucks.env.render("CommonWidgets/switch.html", {
        vDev: this.device.id,
        widgetTitle: this.widgetTitle,
        metricValue: this.value
    });
}

