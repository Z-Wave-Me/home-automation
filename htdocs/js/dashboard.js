function qVar(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split('&');
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split('=');
        if (decodeURIComponent(pair[0]) == variable) {
            return decodeURIComponent(pair[1]);
        }
    }
    return undefined;
}

var DEBUG = qVar("debug") ? true : false;

var apiPort = qVar("port") ? qVar("port") : 8083;
var apiHost = qVar("host") ? qVar("host") : window.location.hostname;
var apiUrl = "http://"+apiHost+":"+apiPort+"/ZAutomation/api";

var virtualDevices = [];
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

function handleWidgetCommand (event) {
    event.preventDefault();
    console.log($(this));

    var device = $(this).data("vdev");
    var commandId = $(this).data("command");

    console.log("Widget command triggered", device, commandId);
}

$(document).ready(function () {
    $(document).on('click', '.widgetCommandButton', handleWidgetCommand);

    $.ajax(apiUrl+"/devices/", {
        method: 'GET'
    }).done(function (reply, textStatus, jqXHR) {
        console.log("API REPLY", textStatus, reply);
        if (typeof reply !== 'object') {
            console.log('error', new Error("Non-object API reply"));
        } else if (reply.error) {
            console.log('error', new Error("API error " + reply.error.code + ": " +reply.error.msg));
        } else {
            virtualDevices = reply.data;
            createVirtualDevicesWidgets();
        }
    }).fail(function (jqXHR, textStatus, err) {
        console.log('error', err);
    });
});
