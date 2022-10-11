/*** InbandNotifications Z-Way HA module *******************************************

Version: 1.1.2
(c) Z-Wave.Me, 2020
-----------------------------------------------------------------------------
Author: Niels Roche <nir@zwave.eu>, Serguei Poltorak <ps@z-wave.me>
Description:
	Listens to the statuses of all devices and
	emits notifications on changed.
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function InbandNotifications (id, controller) {
	// Call superconstructor first (AutomationModule)
	InbandNotifications.super_.call(this, id, controller);
}

inherits(InbandNotifications, AutomationModule);

_module = InbandNotifications;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

InbandNotifications.prototype.init = function (config) {
	InbandNotifications.super_.prototype.init.call(this, config);

	var self = this,
	    lastChanges = [];

	this.writeNotification = function (vDev) {
		if (!vDev.get('permanently_hidden')) {
			var devId = vDev.get('id'),
			    devType = vDev.get('deviceType'),
			    devProbeType = vDev.get('probeType'),
			    devName = vDev.get('metrics:title'),
			    scaleUnit = vDev.get('metrics:scaleTitle'),
			    level = vDev.get('metrics:level');
			
			function getCustomIcon() {
				var customIcons = vDev.get('customIcons');
				if (!customIcons || Object.keys(customIcons).length === 0) return undefined;
				return customIcons.level ? customIcons.level[level] : customIcons.default;
			};

			function eventType(){
				var probeTitle = vDev.get('metrics:probeTitle');
				return probeTitle ? probeTitle.toLowerCase() : 'status';
			};

			var lastEvent = lastChanges.filter(function(e) {
				return e.id === devId;
			})[0];
			
			if (!lastEvent) {
				lastEvent = {
					id: devId,
					l: null
				};
				lastChanges.push(lastEvent);
			}

			var msg = {
				dev: devName,
				l: level, // will be extended below
				location: vDev.get('location'),
				customIcon: getCustomIcon()
			};
			var msgType = "";
			
			if (lastEvent.l === level && ["sensorBinary", "sensorDiscrete", "toggleButton", "switchControl"].indexOf(devType) === - 1)  return; // emit only for new values (not same as previous) or sensorBinary/sensorDiscrete/toggleButton/switchControl events

			// depending on device type choose the correct notification
			switch(devType) {
				case 'switchBinary':
				case 'switchControl':
				case 'sensorBinary':
				case 'fan':
				case 'doorlock':
				case 'toggleButton':
					msgType = 'device-OnOff';
					break;
				case 'switchMultilevel':
					msg.l +=  '%';
					msgType = 'device-status';
					break;
				case 'sensorDiscrete':
					msgType = 'device-status';
					break;
				case 'sensorMultilevel':
				case 'sensorMultiline':
				case 'thermostat':
					msg.l += (scaleUnit ? ' ' + scaleUnit : '');
					msgType = 'device-' + eventType();
					break;
				case 'switchRGBW':
					msg.color = vDev.get('metrics:color');
					msgType = 'device-' + eventType();
					break;
				default:
					return; // don't add the notification
			}
			
			lastEvent.l = level;
			
			self.controller.addNotification('device-info', msg , msgType, devId);
		}	 
	};

	// Setup metric update event listener
	self.controller.devices.on('change:metrics:level', self.writeNotification);
};

InbandNotifications.prototype.stop = function () {
	var self = this;	   

	self.controller.devices.off('change:metrics:level', self.writeNotification);

	InbandNotifications.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
