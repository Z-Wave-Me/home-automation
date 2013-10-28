// ----------------------------------------------------------------------------
// --- Dashboard widgets handling routines
// ----------------------------------------------------------------------------

var virtualDevices = [];
var dashboardWidgets = [];

function createVirtualDevicesWidgets () {
    console.log("--- Creating virtual device widgets...");

    virtualDevices.forEach(function (vDev) {
        if (!vDev.widgetClass) return;

        console.log(vDev.id, "declares widget with class", vDev.widgetClass);

        var rowId = "row"+(Math.floor(dashboardWidgets.length/3));
        if ($('#'+rowId).length == 0) {
            $("#mainContainer").append('<div class="row" id="'+rowId+'"></div>');
        }

        var WidgetClass = window[vDev.widgetClass];
        if (!WidgetClass) {
            console.error("Class", vDev.widgetClass, "doesn't exist");
        } else {
            var widget = new WidgetClass(rowId, vDev);
            if (widget) {
                dashboardWidgets.push(widget);
                // console.log("--! INIT", widget.metrics);
                widget.init();
                widget.updateWidgetUI();
            }
        }
    });
}

// ----------------------------------------------------------------------------
// --- main
// ----------------------------------------------------------------------------

$(document).ready(function () {
    console.log("--- Creating dashboard...");
    events.on("widgetClassesLoaded", function () {
        console.log("--- Loading virtual devices list...");
        // Load and instantiate widgets
        apiRequest("/devices/", function (err, data) {
            if (!!err) {
                console.error("Cannot create vDev widgets:", err.message);
            } else {
                virtualDevices = data;
                createVirtualDevicesWidgets();
            }
        });
    });
});
