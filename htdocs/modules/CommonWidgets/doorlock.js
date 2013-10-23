// ----------------------------------------------------------------------------
// --- Switch widget
// ----------------------------------------------------------------------------
// states: on, off
// ----------------------------------------------------------------------------

function DoorlockWidget (parentElement, device) {
    SwitchWidget.super_.apply(this, arguments);
}

inherits(DoorlockWidget, AbstractWidget);

DoorlockWidget.prototype.updateWidgetUI = function () {
    this.elem.innerHTML = nunjucks.env.render("CommonWidgets/doorlock.html", {
        vDev: this.device.id,
        widgetTitle: this.metrics.title || "Doorlock",
        mode: this.metrics.mode
    });
}

