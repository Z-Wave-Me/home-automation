function redrawDashboard () {
    var dashboardWidgetsHtml = "";

    uiMeta.enabledWidgets.forEach(function (id) {
        var widget = uiMeta.widgets[id];
        var widgetTemplate = "dashboard/widget_"+widget.type+".html";
        dashboardWidgetsHtml += nun.render(widgetTemplate, {
            id: id,
            title: widget.title,
            mainAction: widget.actions[0],
            iconResFormat: widget.iconResFormat,
            metrics: widget.metrics,
            device: widget.device,
            instance: widget.instance
        });
    });

    $("#dynamic").html(dashboardWidgetsHtml);
}

function widgetActionClick (event) {
    event.preventDefault();

    var widgetId = $(this).parent().data("id");
    var instance = $(this).data("instance");
    var action = $(this).data("action");
    var device = $(this).data("device");

    // $.post("/api/instances/"+instance+"/actions/"+action);
    $.ajax("/api/instances/"+instance+"/actions/"+action, {
        method: 'POST'
    }).done(function (reply, textStatus, jqXHR) {
        console.log("API REPLY", textStatus, reply);
        if (typeof reply !== 'object') {
            ee.emit('error', new Error("Non-object API reply"));
        } else if (reply.error) {
            ee.emit('error', new Error("API error " + reply.error.code + ": " +reply.error.msg));
        } else {
            console.log('OK');
        }
    }).fail(function (jqXHR, textStatus, err) {
        ee.emit('error', err);
    });
}

$(document).ready(function () {
    $("body").on('click', '.widgetAction', widgetActionClick);

    ee.on('dashboard.redraw', redrawDashboard);
    ee.on('ui.redrawScreen', function () {
        ee.emit('dashboard.redraw');
    });
});
