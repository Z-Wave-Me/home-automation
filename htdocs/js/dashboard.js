// ----------------------------------------------------------------------------
// --- Dashboard widgets handling routines
// ----------------------------------------------------------------------------

var dashboardWidgets = [];

function createVirtualDevicesWidgets () {
    console.log("--- Devices list", virtualDevices);

    // if (virtualDevices.length > 0) {
    //     $("#mainContainer").html("");
    // }

    virtualDevices.forEach(function (vDev) {
        var widget;

        var rowId = "row"+(dashboardWidgets.length % 4);
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

function handleWidgetModeTargetChangeCommand (event) {
    event.preventDefault();
    console.log($(this));

    var device = $(this).data("vdev");
    var commandId = $(this).data("command");
    var target = $(this).val();
    var widget = widgetByDeviceId(device);


    if (!!widget) {
        console.log("Widget command triggered", device, commandId, target);
        widget.performCommand(commandId, {
            target: target
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
    $(document).on('change', '.widgetModeTargetSelector', handleWidgetModeTargetChangeCommand);

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
