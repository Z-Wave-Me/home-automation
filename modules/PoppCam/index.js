/*** PoppCam Z-Way HA module *******************************************

Version: 1.1.0
(c) Z-Wave.Me, 2017
-----------------------------------------------------------------------------
Author: Stanislav Morozov <r3b@seoarmy.ru>
Description:
    This module stores params of PoppCam

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function PoppCam (id, controller) {
    // Call superconstructor first (AutomationModule)
    PoppCam.super_.call(this, id, controller);
}

inherits(PoppCam, AutomationModule);

_module = PoppCam;

// ----------------------------------------------------------------------------
// --- Module insPoppCam9828tance initialized
// ----------------------------------------------------------------------------

_.extend(PoppCam.prototype, {
    init: function (config) {
        PoppCam.super_.prototype.init.call(this, config);
		var self=this;
        var that = this,
            vDevId = "CameraDevice_" + this.id;
        
        this.proxy_url 	= "/" + vDevId + "/stream";
 
       	var urlup		= config.url + "/moveptz.xml?dir=up";
        var urldown		= config.url + "/moveptz.xml?dir=down";
        var urlleft		= config.url + "/moveptz.xml?dir=left";
        var urlright	= config.url + "/moveptz.xml?dir=right";
		var urlstop		= config.url + "/moveptz.xml?dir=stop"; 

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
        
        /* setting up the autentications seems not to work anymore
        
		this.setup 	= config.url+ "/login.xml?user=" + config.user + "&password=" + config.password + "&usr=" + config.user + "&pwd=" + config.password;  
		if (this.setup) {
            http.request({
                url: this.setup,
                async: true,
                auth: {
                    login: config.user,
                    password: config.password
                }
            });
        }
        */
		    
        this.url	= config.url + "/videostream.cgi?user=" + config.user + "&password=" + config.password;        
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
        PoppCam.super_.prototype.stop.call(this);

        ws.proxify(this.proxy_url, null);
        
        if (this.vDev) {
            this.controller.devices.remove(this.vDev.id);
            this.vDev = null;
        }
    }
});
