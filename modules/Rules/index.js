/*** Rules Z-Way HA module *******************************************

Version: 2.5.1
(c) Z-Wave.Me, 2017
-----------------------------------------------------------------------------
Author: Niels Roche <nir@zwave.eu>
Author: Hans-Christian Göckeritz <hcg@zwave.eu>
Author: Karsten Reichel <kar@zwave.eu>
Description:
	Bind actions on one device to other devices or scenes
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function Rules (id, controller) {
	// Call superconstructor first (AutomationModule)
	Rules.super_.call(this, id, controller);
}

inherits(Rules, AutomationModule);

_module = Rules;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

Rules.prototype.init = function (config) {
	Rules.super_.prototype.init.call(this, config);

	var self = this,
		ifElement = self.config.sourceDevice[self.config.sourceDevice.filterIf];
	this.handlerLevel = function (sDev) {
		var that = self,
			operator = ifElement.operator,
			ifLevel = (ifElement.status === 'level' && ifElement.level) || (!ifElement.status && ifElement.level) ? ifElement.level : ifElement.status,
			check = false,
			value = sDev.get("metrics:level");

		if (operator && ifLevel) {
			switch (operator) {
				case '>':
					check = value > ifLevel;
					break;
				case '=':
					check = value === ifLevel;
					break;
				case '<':
					check = value < ifLevel;
					break;
			}
		}

		if(check || value === ifLevel || sDev.get('deviceType') === 'toggleButton'){

			self.config.targets.forEach(function(el) {
				var type = el.filterThen;

				if(type === "notification") {
					if(typeof el.notification.target !== 'undefined' || typeof el.notification.mail_to_input !== 'undefined') {
						var mail;
						if(el.notification.target.search('@') > 0 || (mail = typeof el.notification.mail_to_input !== 'undefined')) {
							self.addNotification('mail.notification', typeof el.notification.message === 'undefined' ? 'Source: ' + JSON.stringify(self.config.sourceDevice) + ' Target: ' + JSON.stringify(self.config.targets) : el.notification.message, mail ? el.notification.mail_to_input : el.notification.target);
						} else {
							self.addNotification('push.notification', typeof el.notification.message === 'undefined' ? 'Source: ' + JSON.stringify(self.config.sourceDevice) + ' Target: ' + JSON.stringify(self.config.targets) : el.notification.message, el.notification.target);
						}
					}
				} else {
					var id = el[type].target,
						lvl = el[type].status === 'level' && el[type].level? el[type].level : (el[type].status === 'color' && el[type].color? el[type].color: el[type].status),
						vDev = that.controller.devices.get(id),
						// compare old and new level to avoid unneccessary updates
						compareValues = function(valOld,valNew){
							var vO = _.isNaN(parseFloat(valOld))? valOld : parseFloat(valOld),
								vN = _.isNaN(parseFloat(valNew))? valNew : parseFloat(valNew);

							return vO !== vN;
						},
						set = compareValues(vDev.get("metrics:level"), lvl);


					//if (vDev && set) {
					if (vDev && (!el[type].sendAction || (el[type].sendAction && set))) {

						if (vDev.get("deviceType") === type && (type === "switchMultilevel" || type === "thermostat" || type === "switchRGBW")) {
							if (lvl === 'on' || lvl === 'off'){
								vDev.performCommand(lvl);
							} else if (typeof lvl === 'object') {
								vDev.performCommand("exact", lvl);
							} else {
								vDev.performCommand("exact", { level: lvl });
							}
						} else if (vDev.get("deviceType") === "toggleButton" && type === "scene") {
							vDev.performCommand("on");
						} else if (vDev.get("deviceType") === type) {
							vDev.performCommand(lvl);
						}
					}
				}
			});
		}
	};

	// Setup metric update event listener
	if(ifElement && ifElement.device){
		self.controller.devices.on(ifElement.device, 'change:metrics:level', self.handlerLevel);
	}
};

Rules.prototype.stop = function () {
	var self = this;
	
	// remove event listener
	self.controller.devices.off(self.config.sourceDevice[self.config.sourceDevice.filterIf].device,'change:metrics:level', self.handlerLevel);

	Rules.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
