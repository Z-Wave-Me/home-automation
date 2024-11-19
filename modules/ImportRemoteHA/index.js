/*** ImportRemoteHA Z-Way HA module *******************************************

Version: 3.0.0
(c) Z-Wave.Me, 2023
-----------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me>, Niels Roche <nir@zwave.eu>
Description:
	Imports devices from remote HA engine
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function ImportRemoteHA (id, controller) {
	// Call superconstructor first (AutomationModule)
	ImportRemoteHA.super_.call(this, id, controller);
}

inherits(ImportRemoteHA, AutomationModule);

_module = ImportRemoteHA;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

ImportRemoteHA.prototype.init = function (config) {
	ImportRemoteHA.super_.prototype.init.call(this, config);

	var self = this;

	this.uri = "/ZAutomation/api/v1/devices";
	this.responseEventDevices = "ImportRemoteHA-devices";
	
	var is_ws = this.config.url.indexOf('ws://') !== -1 || this.config.url.indexOf('wss://') !== -1
	
	// for backward compatibility with very old systems
	if (!is_ws && this.config.url.indexOf('http://') === -1 && this.config.url.indexOf('https://') === -1) {
		this.config.url = 'http://' + this.config.url + ':8083';
	}

	if (is_ws) {
		// WebSockets
		this.ws_connect();
		this.reconnect_interval = 10;
	} else {
		// HTTP
		this.urlPrefix = this.config.url + this.uri;
		this.dT = Math.max(this.config.dT, 500); // 500 ms minimal delay between requests
		this.timestamp = 0;
		this.lastRequest = 0;
		this.timer = null;
		this.requestUpdate();
	}
};

ImportRemoteHA.prototype.stop = function () {
	var self = this;

	if (this.timer) {
		clearTimeout(this.timer);
	}
	
	if (this.ws) {
		this.ws.close();
	}
	
	this.controller.devices.filter(function(xDev) {
		return (xDev.id.indexOf("RemoteHA_" + self.id + "_") !== -1)
	}).map(function(yDev) {
		return yDev.id
	}).forEach(function(item) {
		self.controller.devices.remove(item);
	});
	
	ImportRemoteHA.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

// WebSockets

ImportRemoteHA.prototype.ws_connect = function () {
	var self = this;
	
	this.ws = new sockets.websocket(this.config.url, undefined, undefined, undefined, undefined, {"Authorization": "Bearer " + this.config.token);
		
	this.ws.onopen = function () {
		console.log("Connected to Remote Z-Way " + this.config.url);
		
		// Request devices
		this.send(JSON.stringify({
			event: "httpEncapsulatedRequest",
			responseEvent: self.responseEventDevices,
			data: {
				url: self.uri
			}
		}));
                return {
                        "ws-reply-type": responseEvent,
                        "ws-reply-data": response
                };
	}
	
	ws.onmessage = function(ev) {
		if (ev["ws-reply-type"] == self.responseEventDevices) {
			self.parseResponse(ev["ws-reply-data"])
		}
	}
	
	var reconnect = function(ev) {
		console.log("Lost connection to Remote Z-Way: " + (!ev ? "closed by remote side" : (ev.data ? ev.data : "unknown error")) + " " + this.config.url);
		this.close();
		self.timer = setInterval(function() {
			self.ws_connect();
		}, self.reconnect_interval * 1000);
		self.ws = undefined;
	}
	
	ws.onclose = reconnect;
	ws.onerror = reconnect;
};

// HTTP

ImportRemoteHA.prototype.requestUpdate = function () {
	var self = this;
	
	this.lastRequest = Date.now();

	var url = this.urlPrefix + "?since=" + this.timestamp.toString();
	try {	
		http.request({
			url: url,
			method: "GET",
			async: true,
			auth: {
				login: self.config.login,
				password: self.config.password
			},
			success: function(response) {
				self.parseResponse(response);
			},
			error: function(response) {
				console.log("Can not make request: " + response.statusText + " " + url); // don't add it to notifications, since it will fill all the notifcations on error
			},
			complete: function() {
				var dt = self.lastRequest + self.dT - Date.now();
				if (dt < 0) {
					dt = 1; // in 1 ms not to make recursion
				}
				
				if (self.timer) {
					clearTimeout(self.timer);
				}
				
				self.timer = setTimeout(function() {
					self.requestUpdate();
				}, dt);
			}
		});
	} catch (e) {
		self.timer = setTimeout(function() {
			self.requestUpdate();
		}, self.dT);
	}
};

// Common

ImportRemoteHA.prototype.parseResponse = function (response) {
	var self = this;
	
	if (response.status === 200, response.contentType === "application/json") {
		var data = response.data.data;
		
		this.timestamp = data.updateTime;
		
		data.devices.forEach(function(item) {
			var localId = "RemoteHA_" + self.id + "_" + item.id,
				vDev = self.controller.devices.get(localId);
			
			if (vDev) {
				for (var m in item.metrics) {
					if (vDev.get("metrics:" + m) !== item.metrics[m]) {
						vDev.set("metrics:" + m, item.metrics[m]);
					}
				}
			} else {

				if (self.skipDevice(localId)) {
					return;
				}

				var dev = {
					deviceId: localId,
					defaults: {
						nodeId: item.nodeId === undefined ? undefined : ('R-' + self.id + (item.bindingName === undefined ? "" : ("_" + item.bindingName)) + "_" + item.nodeId),
						bindingName: item.bindingName === undefined ? undefined : ('R-' + item.bindingName),
						technology: item.technology,
						deviceType: item.deviceType,
						probeType: item.probeType,
						metrics: item.metrics,
						visibility: item.visibility || true,
						permanently_hidden: item.permanently_hidden
					},
					handler: function(command, args) {
						self.handleCommand(this, command, args);
					},
					overlay: {},
					moduleId: this.id
				}

				// add tag if activated
				if (self.config.addTag) {
					dev.overlay.tags = self.config.tagName && self.config.tagName !== ''? [self.config.tagName] : ["RemoteHA_" + self.id];
				}

				self.controller.devices.create(dev);

				self.renderDevice({deviceId: localId, deviceType: item.deviceType});
			}
		});
		
		if (data.structureChanged) {
			var removeList = this.controller.devices.filter(function(xDev) {
				var found = false;
				
				if (xDev.id.indexOf("RemoteHA_" + self.id + "_") === -1) {
					return false; // not to remove devices created by other modules
			   	}

				data.devices.forEach(function(item) {
					if (("RemoteHA_" + self.id + "_" + item.id) === xDev.id) {
						found |= true;
						return false; // break
					}
				});
				return !found;
			}).map(function(yDev) { return yDev.id });
			
			removeList.forEach(function(item) {
				self.controller.devices.remove(item);
			});
		}
	}
};

ImportRemoteHA.prototype.handleCommand = function(vDev, command, args) {
	var self = this;
	
	var argsFlat = "";
	if (args) {
		for (var key in args) {
			argsFlat = argsFlat + (argsFlat ? "&" : "?") + key.toString() + "=" + args[key].toString();
		}
	}
	
	var remoteId = vDev.id.slice(("RemoteHA_" + this.id + "_").length);
	
	var url = this.urlPrefix + "/" + remoteId + "/command/" + command + argsFlat;
	
	http.request({
		url: url,
		method: "GET",
		async: true,
		auth: {
			login: self.config.login,
			password: self.config.password
		},
		error: function(response) {
			console.log("Can not make request: " + response.statusText + " " + url); // don't add it to notifications, since it will fill all the notifcations on error
		}
	});
};

ImportRemoteHA.prototype.skipDevice = function(id) {
	var skip = false;
	
	this.config.skipDevices.forEach(function(skipItem) {
		if (skipItem === id) {
			skip |= true;
			return false; // break
		}   
	});
	
	return skip;
};

// check if deviceId is already added to list
ImportRemoteHA.prototype.renderDevice = function (obj) {
	var skip = false;
	
	this.config.renderDevices.forEach(function (deviceObj) {
		if (deviceObj.deviceId === obj.deviceId) {
			skip |= true;
			return false; // break
		}
	});
	
	if (!skip) {
		this.config.renderDevices.push(obj);
		this.saveConfig();
	}
};
