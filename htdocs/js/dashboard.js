// ----------------------------------------------------------------------------
// --- Dashboard widgets handling routines
// ----------------------------------------------------------------------------

var dashboardWidgets = [];

function createVirtualDevicesWidgets () {
    virtualDevices.forEach(function (vDev) {
        var widget;

        if ("switch" === vDev.vDevType) {
            console.log("Creating vDev Widget for device", vDev.id, "("+vDev.vDevType+")");
            widget = new SwitchWidget("mainRow", vDev);
        } else if ("multilevel" === vDev.vDevType) {
            console.log("Creating vDev Widget for device", vDev.id, "("+vDev.vDevType+")");
            widget = new MultilevelWidget("mainRow", vDev);
        } else if ("probe" === vDev.vDevType) {
            console.log("Creating vDev Widget for device", vDev.id, "("+vDev.vDevType+")");
            widget = new ProbeWidget("mainRow", vDev);
        } else {
            console.log("ERROR", "Unknown virtual device type", vDev.vDevType);
        }

        if (widget) {
            dashboardWidgets.push(widget);
            widget.init();
        }
    });
}

// ----------------------------------------------------------------------------
// --- Virtual devices handling routines
// ----------------------------------------------------------------------------

var virtualDevices = [];

// function initializeVDevWidgets () {
//     $.ajax(apiUrl+"/devices/", {
//         method: 'GET'
//     }).done(function (reply, textStatus, jqXHR) {
//         console.log("API REPLY", textStatus, reply);
//         if (typeof reply !== 'object') {
//             console.log('error', new Error("Non-object API reply"));
//         } else if (reply.error) {
//             console.log('error', new Error("API error " + reply.error.code + ": " +reply.error.msg));
//         } else {
//             virtualDevices = reply.data;
//             createVirtualDevicesWidgets();
//         }
//     }).fail(function (jqXHR, textStatus, err) {
//         console.log('error', err);
//     });
// }

function handleWidgetCommand (event) {
    event.preventDefault();
    console.log($(this));

    var device = $(this).data("vdev");
    var commandId = $(this).data("command");

    console.log("Widget command triggered", device, commandId);
}

// ----------------------------------------------------------------------------
// --- main
// ----------------------------------------------------------------------------

$(document).ready(function () {
    // Event handlers
    $(document).on('click', '.widgetCommandButton', handleWidgetCommand);

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
