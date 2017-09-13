/*** FosCam9805 Z-Way HA module *******************************************

Version: 1.1.0
(c) Z-Wave.Me, 2017
-----------------------------------------------------------------------------
Author: Stanislav Morozov <r3b@seoarmy.ru>
Description:
	This module stores params of FosCam9805

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function FosCam9805 (id, controller) {
	// Call superconstructor first (AutomationModule)
	FosCam9805.super_.call(this, id, controller);
}

inherits(FosCam9805, AutomationModule);

_module = FosCam9805;

// ----------------------------------------------------------------------------
// --- Module insFosCam98059828tance initialized
// ----------------------------------------------------------------------------

_.extend(FosCam9805.prototype, {
	init: function (config) {
		FosCam9805.super_.prototype.init.call(this, config);
		var self=this;
		var that = this,
			vDevId = "CameraDevice_" + this.id;
		
		this.proxy_url 	= "/" + vDevId + "/stream";
		var authent		= "&usr=" + config.user  + "&pwd=" + config.password;
		this.cgi 		= "/cgi-bin/CGIProxy.fcgi?cmd=";
		
		var urlzoomin	= config.url + this.cgi + "zoomIn" + authent;
		var urlzoomout	= config.url + this.cgi + "zoomOut" + authent;
		var urlzoomstop	= config.url + this.cgi + "zoomStop" + authent;
		
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
		
		this.setup	= config.url+ "/cgi-bin/CGIProxy.fcgi?cmd=setSubStreamFormat&format=1" + authent;
		
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
					hasZoomIn: !!urlzoomin,
					hasZoomOut: !!urlzoomout,
					hasClose: !!urlzoomstop || (config.doorDevices && config.doorDevices.length)
				}
			},
			handler: function(command) {
				var url = null;
				
				if (command == "zoomIn") {
					url = urlzoomin;
				} else if (command == "zoomOut") {
					url = urlzoomout;
				} else if (command == "open") {
					url = urlopen;
					opener(command);
				} else if (command == "close") {
					url = urlzoomstop;

 //				   opener(command);
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
		FosCam9805.super_.prototype.stop.call(this);

		ws.proxify(this.proxy_url, null);
		
		if (this.vDev) {
			this.controller.devices.remove(this.vDev.id);
			this.vDev = null;
		}
	}
});
