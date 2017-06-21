/*** VistaCam Z-Way HA module *******************************************

Version: 1.1.0
(c) Z-Wave.Me, 2017
-----------------------------------------------------------------------------
Author: Stanislav Morozov <r3b@seoarmy.ru>
Description:
    This module stores params of VistaCam

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------
VistaCam
function VistaCam (id, controller) {
    // Call superconstructor first (AutomationModule)
    VistaCam.super_.call(this, id, controller);
}

inherits(VistaCam, AutomationModule);

_module = VistaCam;

// ----------------------------------------------------------------------------
// --- Module insVistaCam9828tance initialized
// ----------------------------------------------------------------------------

_.extend(VistaCam.prototype, {
    init: function (config) {
        VistaCam.super_.prototype.init.call(this, config);
		var self=this;
        var that = this,
            vDevId = "CameraDevice_" + this.id;
        
        this.proxy_url 	= "/" + vDevId + "/stream";
        this.cgi 		= "/cgi-bin/CGIProxy.fcgi?cmd=";
        
        
        var opener = function(command) {
            config.doorDevices.forEach(function(el) {
                var vDev = that.controller.devices.get(el);
                
                if (vDev) {
                    var type = vDev.get("deviceType");
                    if (type === "switchBinary") {
                        vDev.performCommand(command == "open" ? "on" : "off");
                    } else if (type === "doorlock") {
                            vDev.performCommand(command);
                    }
                }
            });
        };     
        this.url	= config.url + "/img/video.mjpeg "; 
        console.log(this.url);      
        ws.proxify(this.proxy_url, this.url, "", "");

        this.vDev = this.controller.devices.create({
            deviceId: vDevId,
            defaults: {
                deviceType: "camera",
                metrics: {
                    icon: "camera",
                    title: self.getInstanceTitle()
                }
            },
            overlay: {
                metrics: {
                    url: this.proxy_url,
                }
            },
            handler: function(command) {
                var url = null;

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
        VistaCam.super_.prototype.stop.call(this);

        ws.proxify(this.proxy_url, null);
        
        if (this.vDev) {
            this.controller.devices.remove(this.vDev.id);
            this.vDev = null;
        }
    }
});
