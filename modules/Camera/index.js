/*** Camera Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2013
-----------------------------------------------------------------------------
Author: Stanislav Morozov <r3b@seoarmy.ru>
Description:
    This module stores params of camera

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function Camera (id, controller) {
    // Call superconstructor first (AutomationModule)
    Camera.super_.call(this, id, controller);
}

inherits(Camera, AutomationModule);

_module = Camera;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

_.extend(Camera.prototype, {
    init: function (config) {
        Camera.super_.prototype.init.call(this, config);

        var that = this,
            vDevId = "CameraDevice_" + this.id;
        
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
        
        
        this.proxy_url = "/" + vDevId + "/stream";
        
        ws.proxify(this.proxy_url, config.url, config.user, config.password);

        this.vDev = this.controller.devices.create({
            deviceId: vDevId,
            defaults: {
                deviceType: "camera",
                metrics: {
                    icon: 'camera',
                    title: 'Camera ' + this.id
                }
            },
            overlay: {
                metrics: {
                    url: this.proxy_url,
                    hasZoomIn: !!config.zoomInUrl,
                    hasZoomOut: !!config.zoomOutUrl,
                    hasLeft: !!config.leftUrl,
                    hasRight: !!config.rightUrl,
                    hasUp: !!config.upUrl,
                    hasDown: !!config.downUrl,
                    hasOpen: !!config.openUrl || (config.doorDevices && config.doorDevices.length),
                    hasClose: !!config.closeUrl || (config.doorDevices && config.doorDevices.length)
                }
            },
            handler: function(command) {
                var url = null;

                if (command == "zoomIn") {
                    url = config.zoomInUrl;
                } else if (command == "zoomOut") {
                    url = config.zoomOutUrl;
                } else if (command == "left") {
                    url = config.leftUrl;
                } else if (command == "right") {
                    url = config.rightUrl;
                } else if (command == "up") {
                    url = config.upUrl;
                } else if (command == "down") {
                    url = config.downUrl;
                } else if (command == "open") {
                    url = config.openUrl;
                    opener(command);
                } else if (command == "close") {
                    url = config.closeUrl;
                    opener(command);
                }

                if (url) {
                    http.request({
                        url: url,
                        async: true,
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
        Camera.super_.prototype.stop.call(this);

        ws.proxify(this.proxy_url, null);
        
        if (this.vDev) {
            this.controller.devices.remove(this.vDev.id);
            this.vDev = null;
        }
    }
});
