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
            metrics: widget.metrics
        });
    });

    $("#dynamic").html(dashboardWidgetsHtml);
}

function widgetActionClick (event) {
    event.preventDefault();

    var widgetId = $(this).parent().data("id");
    var action = $(this).data("action");

    console.log("widgetActionClick", widgetId, action);
}

$(document).ready(function () {
    $("body").on('click', '.widgetAction', widgetActionClick);

    ee.on('dashboard.redraw', redrawDashboard);
    ee.on('ui.redrawScreen', function () {
        ee.emit('dashboard.redraw');
    });
});
