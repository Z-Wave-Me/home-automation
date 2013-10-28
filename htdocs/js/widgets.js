// ----------------------------------------------------------------------------
// --- Abstract widget class
// ----------------------------------------------------------------------------

function AbstractWidget (parentElement, device) {
    this.parentElementId = parentElement;
    this.device = device;

    this.value = this.device.metrics.level;
    this.metrics = this.device.metrics;

    var self = this;
    events.on('device.metricUpdated', function (deviceId, name, value) {
        // console.log("--- device.metricUpdated", deviceId, name, value);
        if (self.device.id === deviceId) {
            if ("level" === name) {
                self.setValue(value);
            }
            self.setMetricValue(name, value);
        }
    });

}

AbstractWidget.prototype.init = function () {
    var parent = document.getElementById(this.parentElementId);
    this.elem = document.createElement("div");
    parent.appendChild(this.elem);
};

AbstractWidget.prototype.setValue = function (value, callback) {
    this.value = value;
    this.updateWidgetUI();
    if (callback) callback(value);
}

AbstractWidget.prototype.setMetricValue = function (name, value, callback) {
    this.metrics[name] = value;
    this.updateWidgetUI();
    if (callback) callback(name, value);
}

AbstractWidget.prototype.updateWidgetUI = function () {
    console.log("Don't know how to update widget UI", this);
}

AbstractWidget.prototype.commandApiUri = function (command) {
    return "/devices/"+this.device.id+"/command/"+command;
}

AbstractWidget.prototype.performCommand = function (command, args) {
    apiRequest(this.commandApiUri(command), null, {
        data: args
    });
}

// ----------------------------------------------------------------------------
// --- Shared Widgets UI handlers
// ----------------------------------------------------------------------------

function handleWidgetCommand (event) {
    event.preventDefault();

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
// --- Additional routines
// ----------------------------------------------------------------------------

function widgetByDeviceId (deviceId) {
    var search = dashboardWidgets.filter(function (item) {
        return item.device.id === deviceId;
    });

    return 1 === search.length ? search[0] : null;
}

var widgetClasses = {};

// TODO: Remove mock before release!
function findCustomWidgetClass (vDev) {
    var className = widgetClasses[vDev.deviceSubType];
    return !!className ? eval(className) : null;
}

// ----------------------------------------------------------------------------
// --- Registered widgets loader
// ----------------------------------------------------------------------------

$(document).ready(function () {
    // Event handlers
    console.log("--- Setting global widget event handlers...");
    $(document).on('click', '.widgetCommandButton', handleWidgetCommand);
    $(document).on('change', '.widgetModeSelector', handleWidgetModeChangeCommand);
    $(document).on('change', '.widgetModeTargetSelector', handleWidgetModeTargetChangeCommand);

    console.log("--- Loading widget classes...");
    apiRequest("/widgets/", function (err, data) {
        if (!!err) {
            console.log("Cannot load widget classes list:", err.message);
        } else {
            Object.keys(data).forEach(function (widgetClassName) {
                var meta = data[widgetClassName];

                console.log("Loading widget class", meta.className);
                $.getScript("modules/"+meta.code, function (script, textStatus, jqXHR) {
                    if (window.hasOwnProperty(meta.className)) {
                        widgetClasses[meta.className] = meta;
                        widgetClasses[meta.className].cls = window[meta.className];
                    } else {
                        console.error("Cannot find widget class", meta.className, "after code is loaded.");
                    }
                });
            });

            events.emit("widgetClassesLoaded");
        }
    });
});
