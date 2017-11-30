/*** TPLinkHS100 Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2017
-----------------------------------------------------------------------------
Author: Karsten Reichel <kar@zwave.eu>
Description:
	This module allows to switch the TP-Link HS100 plug.

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------


function TPLinkHS100 (id, controller) {
	// Call superconstructor first (AutomationModule)
	TPLinkHS100.super_.call(this, id, controller);
}

inherits(TPLinkHS100, AutomationModule);

_module = TPLinkHS100;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

TPLinkHS100.prototype.init = function (config) {
	TPLinkHS100.super_.prototype.init.call(this, config);
		
		vDevId = "TPLinkHS100_" + this.id;
			
		this.commands = {
			on: 	'{"system":{"set_relay_state":{"state":1}}}',
			off: 	'{"system":{"set_relay_state":{"state":0}}}',
			update: '{"system":{"get_sysinfo":{}}}'
		};

		this.encrypt = function(data) {
			var key = 171;
			var result = "\0\0\0\0";
			for (var i = 0, len = data.length; i < len; i++) {
				key = key^data.charCodeAt(i);
				result += String.fromCharCode(key);
			}
			return result
		}

		this.decrypt = function(data) {
			var key = 171;
			var result = "";
			for (var i = 4, len = data.length; i < len; i++) {
				var a = key^data.charCodeAt(i);
				key = data.charCodeAt(i);
				result += String.fromCharCode(a);
			}
			return JSON.parse(result);			
		}

		var self = this;

		this.vDev = this.controller.devices.create({
			deviceId: vDevId,
			defaults: {
				deviceType: 'switchBinary',
				customIcons: {},
				metrics: {
					icon: 'switch',
					level: 'off', 
					title: self.getInstanceTitle()
				},
			},
			overlay: {
				deviceType: 'switchBinary'
			},
			handler: function(command) {
				var sock = new sockets.tcp();
				sock.onconnect = function() {
					this.send(self.encrypt(self.commands[command]));
					if (command != 'update') {
						this.close();
						self.vDev.set('metrics:level', command);
					}
				};
				if (command == 'update') {
					sock.onrecv = function(data, host, port) {
						var msg = String.fromCharCode.apply(null, new Uint8Array(data));
						var res = self.decrypt(msg);
						if (typeof res.system.get_sysinfo.relay_state != 'undefined') {
							self.vDev.set('metrics:level', res.system.get_sysinfo.relay_state == 1 ? 'on' : 'off');
						}
						this.close();
					};

				}
				sock.connect(self.config.url, 9999);
			},
			moduleId: this.id
		});
};

TPLinkHS100.prototype.stop = function () {

	if (this.vDev) {
		this.controller.devices.remove(this.vDev.id);
		this.vDev = null;
	}

	TPLinkHS100.super_.prototype.stop.call(this);
};
