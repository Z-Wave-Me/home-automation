/*** MQTT Client Z-Way HA module ****************************************************

Version: 1.0
(c) Z-Wave.Me, 2021
-----------------------------------------------------------------------------
Author: Yurkin Vitaliy <aivs@z-wave.me>
Description:
   Publishes the devices status to a MQTT topics and receives device control commands.
 *****************************************************************************/


// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function MQTTClient(id, controller) {
	MQTTClient.super_.call(this, id, controller);
}

inherits(MQTTClient, AutomationModule);

_module = MQTTClient;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

MQTTClient.prototype.init = function(config) {
	// Call superclass' init (this will process config argument and so on)
	MQTTClient.super_.prototype.init.call(this, config);

	var self = this;
	this.updateSkippedDevicesList();

	var clientId = this.config.clientId;
	if (this.config.clientIdRandomize)
		clientId += "-" + Math.random().toString(16).substr(2, 6);

	// 1 - Open MQTT Socket
	if (this.config.user && this.config.password)
		this.m = new mqtt(this.config.host, this.config.port, this.config.user, this.config.password, clientId);
	else
		this.m = new mqtt(this.config.host, this.config.port, clientId);

	// 2 - Init MQTT handlers
	this.m.onconnect = function () {
		this.subscribe(self.config.topicPrefix + "/" + self.config.topicPostfixSet + "/#");
	};

	this.m.onmessage = function (topic, byteArrayMsg) {
		var msg = byteArrayToString(byteArrayMsg);
		var channels = topic.split("/"),
			vDevId = channels[channels.length - 1],
			vDevFound = false;

		self.controller.devices.forEach(function(vDev) {
			if (vDev.id === vDevId) {
				vDevFound = true;
				var deviceType = vDev.get("deviceType");

				if ((deviceType === "switchMultilevel" || deviceType === "thermostat") && 
					msg !== "on" && msg !== "off" && msg !== "stop") {
					vDev.performCommand("exact", {level: parseInt(msg)});
				} else {
					vDev.performCommand(msg);
				}
			}
		});
		
		if (!vDevFound) {
			console.log("--- MQTTClient: Device " + vDevId + " Not Found");
		}
	};

	// 3 - Connect
	try {
		self.m.connect();
		console.log("--- MQTTClient connected to", self.config.host);
	} catch (err) {
		console.log("--- MQTTClient connect error to", self.config.host, err);
	}


	this.onLevelChanged = function(vDev) {
		// if Not mqtt-skip, then publish device status and full data
		if (vDev.get("tags").indexOf("mqtt-skip") === -1) {
			if (self.config.topicPostfixStatus) {
				self.m.publish(self.config.topicPrefix + "/" + self.config.topicPostfixStatus + "/" + vDev.id, vDev.get("metrics:level").toString());
			}
			if (self.config.topicPostfixData) {
				self.m.publish(self.config.topicPrefix + "/" + self.config.topicPostfixData + "/" + vDev.id, JSON.stringify(vDev));
			}
		}
	};

	this.onTagsChanged = function(vDev) {
		// Add tag "mqtt-skip" to skipped Devices list in config
		if (vDev.get("tags").indexOf("mqtt-skip") !== -1 && self.config.skippedDevices.indexOf(vDev.id) === -1) {
			self.config.skippedDevices.push(vDev.id);
			self.saveConfig();
	  	}

	  	// Remove tag "mqtt-skip" from skipped Devices list in config
	  	if (vDev.get("tags").indexOf("mqtt-skip") === -1 && self.config.skippedDevices.indexOf(vDev.id) !== -1) {
	  		var index = self.config.skippedDevices.indexOf(vDev.id);
			self.config.skippedDevices.splice(index, 1);
			self.saveConfig();
	  	}
	};

	this.controller.devices.on("change:metrics:level", this.onLevelChanged);
	this.controller.devices.on("change:tags", this.onTagsChanged);
};

MQTTClient.prototype.stop = function () {
	var self = this;
	this.controller.devices.off("change:metrics:level", this.onLevelChanged);
	this.controller.devices.off("change:tags", this.onTagsChanged);

        try {
                self.m.disconnect();
                console.log("--- MQTTClient disconnected from", self.config.host);
        } catch (err) {
                console.log("--- MQTTClient disconnect error from", self.config.host, err);
        }

	MQTTClient.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

MQTTClient.prototype.updateSkippedDevicesList = function() {
	var self = this

	// Add tag "mqtt-skip" for all skipped devices from config
	this.config.skippedDevices.forEach(function(vDevId) {
		var vDev = self.controller.devices.get(vDevId);
  		if (vDev !== null && vDev.get("tags").indexOf("mqtt-skip") === -1 ) {
  			vDev.addTag("mqtt-skip");
  		}
	});

	// Remove tag "mqtt-skip" if device not in skipped list
	this.controller.devices.forEach(function(vDev) {
		if (vDev !== null 
			&& vDev.get("tags").indexOf("mqtt-skip") !== -1
			&& self.config.skippedDevices.indexOf(vDev.id) === -1) {
  				vDev.removeTag("mqtt-skip");
  		}
	});
};
