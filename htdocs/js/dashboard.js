// ----------------------------------------------------------------------------
// --- Dashboard widgets handling routines
// ----------------------------------------------------------------------------

var dashboardWidgets = [];

function createVirtualDevicesWidgets () {
    console.log("--- Devies list", virtualDevices);
    virtualDevices.forEach(function (vDev) {
        var widget;

        if ("switch" === vDev.deviceType) {
            console.log("Creating vDev Widget for device", vDev.id, "("+vDev.deviceType+")");
            widget = new SwitchWidget("mainRow", vDev);
        } else if ("sensor" === vDev.deviceType) {
            console.log("Creating vDev Widget for device", vDev.id, "("+vDev.deviceType+")");
            widget = new SensorWidget("mainRow", vDev);
        } else if ("multilevel" === vDev.deviceType) {
            console.log("Creating vDev Widget for device", vDev.id, "("+vDev.deviceType+")");
            widget = new MultilevelWidget("mainRow", vDev);
        } else if ("probe" === vDev.deviceType) {
            console.log("Creating vDev Widget for device", vDev.id, "("+vDev.deviceType+")");
            widget = new ProbeWidget("mainRow", vDev);
        } else if ("climate" === vDev.deviceType && "fan" === vDev.deviceSubType) {
            console.log("Creating vDev Widget for device", vDev.id, "("+vDev.deviceType+", "+vDev.deviceSubType+")");
            widget = new FanWidget("mainRow", vDev);
        } else {
            console.log("ERROR", "Unknown virtual device type", vDev.deviceType);
        }

        if (widget) {
            dashboardWidgets.push(widget);
            widget.init();
        }
    });
}

function widgetByDeviceId (deviceId) {
    var search = dashboardWidgets.filter(function (item) {
        return item.device.id === deviceId;
    });

    return 1 === search.length ? search[0] : null;
}

// ----------------------------------------------------------------------------
// --- Virtual devices handling routines
// ----------------------------------------------------------------------------

var virtualDevices = [];

function handleWidgetCommand (event) {
    event.preventDefault();
    console.log($(this));

    var device = $(this).data("vdev");
    var commandId = $(this).data("command");
    var widget = widgetByDeviceId(device);

    if (!!widget) {
        console.log("Widget command triggered", device, commandId);
        widget.performCommand(commandId);
    } else {
        console.log("ERROR", "Cannot find widget for vDev", device);
    }
}

function handleWidgetModeChangeCommand (event) {
    event.preventDefault();
    console.log($(this));

    var device = $(this).data("vdev");
    var commandId = $(this).data("command");
    var modeId = $(this).val();
    var widget = widgetByDeviceId(device);


    if (!!widget) {
        console.log("Widget command triggered", device, commandId, modeId);
        widget.performCommand(commandId, {
            mode: modeId
        });
    } else {
        console.log("ERROR", "Cannot find widget for vDev", device);
    }
}

// ----------------------------------------------------------------------------
// --- main
// ----------------------------------------------------------------------------

$(document).ready(function () {
    // Event handlers
    $(document).on('click', '.widgetCommandButton', handleWidgetCommand);
    $(document).on('change', '.widgetModeSelector', handleWidgetModeChangeCommand);

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
