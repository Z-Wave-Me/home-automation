// ----------------------------------------------------------------------------
// --- Multilevel widget
// ----------------------------------------------------------------------------
// states: 0-99 %
// ----------------------------------------------------------------------------

function MultilevelWidget (parentElement, deviceId) {
    MultilevelWidget.super_.apply(this, arguments);
}

inherits(MultilevelWidget, AbstractWidget);

MultilevelWidget.prototype.updateWidgetUI = function () {
    var valueString="";

    if (this.value >= 99) {
        valueString = "Full"
    } else if (0 === this.value) {
        valueString = "Off"
    } else {
        valueString = Math.round(this.value) + "%";
    }

    this.elem.innerHTML = nunjucks.env.render("CommonWidgets/multilevel.html", {
        vDev: this.device.id,
        widgetTitle: this.metrics["title"] || "Dimmer",
        metricValue: this.value
    });
}

