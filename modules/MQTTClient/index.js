/*** MQTT Client Z-Way HA module ****************************************************

Version: 1.2.1
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

	// Create instance variables
	this.reconnectInterval = null;
};

inherits(MQTTClient, AutomationModule);

_module = MQTTClient;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

MQTTClient.prototype.init = function(config) {
	// Call superclass' init (this will process config argument and so on)
	MQTTClient.super_.prototype.init.call(this, config);

	var self = this;
	var mqttConnected = false;
	var mqttConnectionAttempts = 0;

	var vDev = this.controller.devices.create({
		deviceId: "MQTTClient" + this.id,
		defaults: {
			metrics: {
				title: "MQTT Client Connection Status " + this.config.host
			}
		},
		overlay: {
			deviceType: "text",
			metrics: {
				text: "Not connected",
				icon: "/ZAutomation/api/v1/load/modulemedia/MQTTClient/icon.png"
			}
		},
		moduleId: this.id
	});


	this.updateSkippedDevicesList();

	var clientId = this.config.clientId;
	if (this.config.clientIdRandomize)
		clientId += "-" + Math.random().toString(16).substr(2, 6);

	// 1 - Open MQTT Socket
	if (this.config.user && this.config.password)
		this.m = new mqtt(this.config.host, this.config.port, this.config.user, this.config.password, clientId);
	else
		this.m = new mqtt(this.config.host, this.config.port, clientId);

	if (this.config.security) {
		try {
			this.m.tlsset();
		} catch (e) {
			console.log("--- MQTTClient security error:", e);
		}
	}

	// 2 - Init MQTT handlers
	this.m.onconnect = function () {
		console.log("--- MQTTClient connected to", self.config.host);
		vDev.set("metrics:text", "Connected to " + self.config.host);
		clearInterval(self.reconnectInterval);
		self.reconnectInterval = null;
		mqttConnected = true;
		mqttConnectionAttempts = 0;
		this.subscribe(self.config.topicPrefix + "/" + self.config.topicPostfixSet + "/#");
		self.controller.devices.on("change:metrics:level", self.onLevelChanged);
	};

	this.m.ondisconnect = function () {
		console.log("--- MQTTClient disconnected");
		vDev.set("metrics:text", "Disconnected. Trying to connect every 1 second");
		mqttConnected = false;
		mqttConnectionAttempts = 0;
		self.controller.devices.off("change:metrics:level", self.onLevelChanged);
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

				if (msg !== "on" && msg !== "off" && msg !== "stop" && msg !== "open" && msg !== "close") {
					if (deviceType === "switchMultilevel") {
						vDev.performCommand("exact", {level: parseInt(msg)});
					}
					else if (deviceType === "thermostat") {
						vDev.performCommand("exact", {level: parseFloat(msg)});
					}
				}
				else {
					vDev.performCommand(msg);
				}
			}
		});
		
		if (!vDevFound) {
			console.log("--- MQTTClient: Device " + vDevId + " Not Found");
		}
	};

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

	this.controller.devices.on("change:tags", this.onTagsChanged);

	// 3 - Connect
	try {
		mqttConnectionAttempts = mqttConnectionAttempts + 1;
		console.log("--- MQTTClient attempt to connect first time...");
		vDev.set("metrics:text", "Attempt to connect first time...");
		self.m.connect();
	} catch (err) {
		console.log("--- MQTTClient connection error", self.config.host, err, "Reconnect after 5 seconds...");
		vDev.set("metrics:text", "--- MQTTClient connection error: " + err);
	}

	// Check connection after 5 seconds
	self.reconnectInterval = setInterval(function() {
		if (!mqttConnected) {
			try {
				mqttConnectionAttempts = mqttConnectionAttempts + 1;
				console.log("--- MQTTClient attempts to connect " + mqttConnectionAttempts + " ...");
				vDev.set("metrics:text", "Attempts to connect " + mqttConnectionAttempts + " ...");
				self.m.connect();
			} catch (err) {
				console.log("--- MQTTClient connection error", self.config.host, err, "Reconnect after 5 seconds...");
				vDev.set("metrics:text", "--- MQTTClient connection error: " + err);
			}
		}
	}, 5000);
};

MQTTClient.prototype.stop = function () {
	var self = this;
	this.controller.devices.off("change:metrics:level", this.onLevelChanged);
	this.controller.devices.off("change:tags", this.onTagsChanged);
	clearInterval(this.reconnectInterval);
	this.reconnectInterval = null;
	this.controller.devices.remove("MQTTClient" + this.id);

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

MQTTClient.prototype.updateSkippedDevicesList = function () {
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
