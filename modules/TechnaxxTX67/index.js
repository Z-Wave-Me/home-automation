/*** TechnaxxTX67 Z-Way HA module *******************************************

 Version: 0.0.1
 (c) Z-Wave.Me, 2017
 -----------------------------------------------------------------------------
 Author: Michael Hensche mh@zwave.eu
 Description:
 This module stores params of TechnaxxTX67

 ******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function TechnaxxTX67 (id, controller) {
    // Call superconstructor first (AutomationModule)
    TechnaxxTX67.super_.call(this, id, controller);
}

inherits(TechnaxxTX67, AutomationModule);

_module = TechnaxxTX67;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

_.extend(TechnaxxTX67.prototype, {
    init: function (config) {
        TechnaxxTX67.super_.prototype.init.call(this, config);

        var that = this,
            vDevId = "TechnaxxTX67Device_" + this.id;

        var opener = function(command) {
            config.doorDevices.forEach(function(el) {
                var vDev = that.controller.devices.get(el);

                if (vDev) {
                    var type = vDev.get("deviceType");
                    if (type === "switchBinary" || "switchMultilevel") {
                        vDev.performCommand(command == "open" ? "on" : "off");
                    } else if (type === "doorlock") {
                        vDev.performCommand(command);
                    }
                }
            });
        };

        this.proxy_screen_url = "/" + vDevId + "/screen";
        this.screen_url = config.ip + config.screenUrl;
        ws.proxify(this.proxy_screen_url, this.screen_url, config.user, config.password);

        this.proxy_url = "/" + vDevId + "/stream";
        this.url = config.ip + config.streamUrl;
        ws.proxify(this.proxy_url, this.url, config.user, config.password);

        this.vDev = this.controller.devices.create({
            deviceId: vDevId,
            defaults: {
                deviceType: "camera",
                metrics: {
                    icon: "camera",
                    title: that.getInstanceTitle()
                }
            },
            overlay: {
                metrics: {
                    url: this.proxy_url,
                    screenUrl: this.proxy_screen_url,
                    hasLeft: true,
                    hasRight: true,
                    hasUp: true,
                    hasDown: true,
                    hasOpen: !!config.openUrl || (config.doorDevices && config.doorDevices.length),
                    hasClose: !!config.closeUrl || (config.doorDevices && config.doorDevices.length)
                }
            },
            handler: function(command) {
                var url = null;

                if (command == "left") {
                    url = config.ip +config.leftUrl;
                } else if (command == "right") {
                    url = config.ip + config.rightUrl;
                } else if (command == "up") {
                    url = config.ip + config.upUrl;
                } else if (command == "down") {
                    url = config.ip + config.downUrl;
                } else if (command == "open") {
                    url = config.openUrl;
                    opener(command);
                } else if (command == "close") {
                    url = config.closeUrl;
                    opener(command);
                };

                if (url) {
                    http.request({
                        url: url,
                        async: true,
                        auth: {
                            login: config.user,
                            password: config.password
                        }
                    });
                    var stopUrl = config.ip + config.stopUrl;
                    http.request({
                        url: stopUrl,
                        async: false,
                        auth: {
                            login: config.user,
                            password: config.password
                        }
                    });
                }
            },
            moduleId: this.id
        });
    },
    stop: function () {
        TechnaxxTX67.super_.prototype.stop.call(this);

        ws.proxify(this.proxy_url, null);
        ws.proxify(this.proxy_screen_url, null);

        if (this.vDev) {
            this.controller.devices.remove(this.vDev.id);
            this.vDev = null;
        }
    }
});
