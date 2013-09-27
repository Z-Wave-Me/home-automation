// ----------------------------------------------------------------------------
// --- Dashboard widgets handling routines
// ----------------------------------------------------------------------------

var virtualDevices = [];
var dashboardWidgets = [];

function createVirtualDevicesWidgets () {
    console.log("--- Devices list", virtualDevices);

    virtualDevices.forEach(function (vDev) {
        var widget;

        var rowId = "row"+(Math.floor(dashboardWidgets.length/3));
        if ($('#'+rowId).length == 0) {
            console.log($("#mainContainer"));
            $("#mainContainer").append('<div class="row" id="'+rowId+'"></div>');
        }

        if ("switch" === vDev.deviceType) {
            console.log("Creating vDev Widget for device", vDev.id, "("+vDev.deviceType+")");
            widget = new SwitchWidget(rowId, vDev);
        } else if ("sensor" === vDev.deviceType) {
            console.log("Creating vDev Widget for device", vDev.id, "("+vDev.deviceType+")");
            widget = new SensorWidget(rowId, vDev);
        } else if ("multilevel" === vDev.deviceType) {
            console.log("Creating vDev Widget for device", vDev.id, "("+vDev.deviceType+")");
            widget = new MultilevelWidget(rowId, vDev);
        } else if ("probe" === vDev.deviceType) {
            console.log("Creating vDev Widget for device", vDev.id, "("+vDev.deviceType+")");
            widget = new ProbeWidget(rowId, vDev);
        } else if ("climate" === vDev.deviceType && "fan" === vDev.deviceSubType) {
            console.log("Creating vDev Widget for device", vDev.id, "("+vDev.deviceType+", "+vDev.deviceSubType+")");
            widget = new FanWidget(rowId, vDev);
        } else if ("climate" === vDev.deviceType && "thermostat" === vDev.deviceSubType) {
            console.log("Creating vDev Widget for device", vDev.id, "("+vDev.deviceType+", "+vDev.deviceSubType+")");
            widget = new ThermostatWidget(rowId, vDev);
        } else {
            console.log("ERROR", "Unknown virtual device type", vDev.deviceType);
        }

        if (widget) {
            dashboardWidgets.push(widget);
            widget.init();
        }
    });
}

// ----------------------------------------------------------------------------
// --- main
// ----------------------------------------------------------------------------

$(document).ready(function () {
    events.on("widgetClassesLoaded", function () {
        // Load and instantiate widgets
        apiRequest("/devices/", function (err, data) {
            if (!!err) {
                console.log("Cannot create vDev widgets:", err.message);
            } else {
                virtualDevices = data;
                createVirtualDevicesWidgets();
            }
        });
    });
});
