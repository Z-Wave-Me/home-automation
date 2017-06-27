/*** FosCam9821 Z-Way HA module *******************************************

Version: 1.1.0
(c) Z-Wave.Me, 2017
-----------------------------------------------------------------------------
Author: Stanislav Morozov <r3b@seoarmy.ru>
Description:
    This module stores params of FosCam9821

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function FosCam9821 (id, controller) {
    // Call superconstructor first (AutomationModule)
    FosCam9821.super_.call(this, id, controller);
}

inherits(FosCam9821, AutomationModule);

_module = FosCam9821;

// ----------------------------------------------------------------------------
// --- Module insFosCam98219828tance initialized
// ----------------------------------------------------------------------------

_.extend(FosCam9821.prototype, {
    init: function (config) {
        FosCam9821.super_.prototype.init.call(this, config);
		var self=this;
        var that = this,
            vDevId = "CameraDevice_" + this.id;
        
        this.proxy_url 	= "/" + vDevId + "/stream";
        var authent		= "&usr=" + config.user  + "&pwd=" + config.password;
        this.cgi 		= "/cgi-bin/CGIProxy.fcgi?cmd=";
        
       	var urlup		= config.url + this.cgi + "ptzMoveUp" + authent;
        var urldown		= config.url + this.cgi + "ptzMoveDown" + authent;
        var urlleft		= config.url + this.cgi + "ptzMoveLeft" + authent;
        var urlright	= config.url + this.cgi + "ptzMoveRight" + authent;
		var urlstop		= config.url + this.cgi + "ptzStopRun" + authent; 
        
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
        
		this.setup 	= config.url+ "/cgi-bin/CGIProxy.fcgi?cmd=setSubStreamFormat&format=1" + authent;

        if (this.setup) {
            http.request({
                url: this.setup,
                async: true
            });
        }

        this.url	= config.url + "/cgi-bin/CGIStream.cgi?cmd=GetMJStream" + authent;        
        ws.proxify(this.proxy_url, this.url, config.user, config.password);

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
                    hasLeft: !!urlleft,
                    hasRight: !!urlright,
                    hasUp: !!urlup,
                    hasDown: !!urldown,
                    hasClose: !!urlstop || (config.doorDevices && config.doorDevices.length)
                }
            },
            handler: function(command) {
                var url = null;
                console.log(urlstop);  
				if (command == "left") {
                    url = urlleft;
                } else if (command == "right") {
                    url = urlright
                } else if (command == "up") {
                    url = urlup;
                } else if (command == "down") {
                    url = urldown;
                } else if (command == "open") {
                    url = urlopen;
                    opener(command);
                } else if (command == "close") {
                    url = urlstop;

 //                   opener(command);
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
        FosCam9821.super_.prototype.stop.call(this);

        ws.proxify(this.proxy_url, null);
        
        if (this.vDev) {
            this.controller.devices.remove(this.vDev.id);
            this.vDev = null;
        }
    }
});
