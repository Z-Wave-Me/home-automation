/*** EdimaxSP1101 Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2017
-----------------------------------------------------------------------------
Author: Karsten Reichel <kar@zwave.eu>
Description:
	This module allows to switch the Edimax SP-1101 plug.

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------


function EdimaxSP1101 (id, controller) {
	// Call superconstructor first (AutomationModule)
	EdimaxSP1101.super_.call(this, id, controller);
}

inherits(EdimaxSP1101, AutomationModule);

_module = EdimaxSP1101;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

EdimaxSP1101.prototype.init = function (config) {
	EdimaxSP1101.super_.prototype.init.call(this, config);
		
		vDevId = 'EdimaxSP1101_' + this.id;

		this.url = 'http://admin:1234@' + config.url + ':10000/smartplug.cgi';

		this.xml = '<?xml version="1.0" encoding="utf-8"?><SMARTPLUG id="edimax"><CMD id="setup"><Device.System.Power.State>${state}</Device.System.Power.State></CMD></SMARTPLUG>';		
			
		var self = this;

		this.vDev = this.controller.devices.create({
			deviceId: vDevId,
			defaults: {
				deviceType: 'switchBinary',
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
				if (command != 'update') {
					var data = self.xml.replace('${state}',command.toUpperCase());				
					http.request({
							method: 'POST',
							url: self.url,
							async: true,
							data: data,
							success: function(response) {
								self.vDev.set('metrics:level', command);
							},
							error: function(response) {
								console.log('EdimaxSP1101 - ERROR: ' + response.statusText); 
							} 
						});
				}				
			},
			moduleId: this.id
		});
};

EdimaxSP1101.prototype.stop = function () {

	if (this.vDev) {
		this.controller.devices.remove(this.vDev.id);
		this.vDev = null;
	}

	EdimaxSP1101.super_.prototype.stop.call(this);
};
