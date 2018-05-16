/*** Zniffer Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2017
-----------------------------------------------------------------------------
Author: Niels Roche <nir@zwave.eu>
Description:
	Zniffer support

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function Zniffer (id, controller) {
	// Call superconstructor first (AutomationModule)
	Zniffer.super_.call(this, id, controller);
}

inherits(Zniffer, AutomationModule);

_module = Zniffer;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

Zniffer.prototype.init = function (config) {
	Zniffer.super_.prototype.init.call(this, config);

	var self = this;
	
	this.langFile = self.loadModuleLang();

	this.startZnifferBinding();
	if (!this.zniffer) {
		return;
	}
};

Zniffer.prototype.stop = function () {

	this.stopZnifferBinding();

	this.externalAPIRevoke();
	delete global["ZnifferAPI"];

	Zniffer.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

Zniffer.prototype.CommunicationLogger = function() {
	var self = this,
		zway = this.zway,
		now = Math.floor((new Date()).valueOf() / 1000) -3, //now - 3 seconds
		packets = [],
		znifferPackets = [];

	if (this.zniffer) {
		try {

			console.log('#### now', now);
			packets = this.zniffer.fetch(now);

			if (packets) {

				//console.log('#### packets', packets);

				packets = parseToObject(packets);

				if (packets.packages) {
					packets = packets.packages;

					console.log("### self.znifferPackets.get():", self.znifferPackets.get().length);
					console.log("### packets.length:", packets.length);
					znifferPackets = _.uniq(self.znifferPackets.get().concat(packets));

					console.log("### znifferPackets:", znifferPackets.length);

					//console.log('#### znifferPackets', JSON.stringify(znifferPackets));

					self.znifferPackets.set(znifferPackets);
				}
			}

		} catch (e) {
			console.log(e.toString(self.znifferPackets.get()));
		}
	} else {
		//remove logger intervall
		this.removeInterval();
		console.log('Cannot fetch Zniffer packets. Seems Zniffer is not initialized correctly.');
		return;
	}

	/*var inH = function (type) {
		var data = this;
		
		if (type === self.ZWAY_DATA_CHANGE_TYPE["Deleted"]) return;
		
		// save the packet as it is
		data.direction = "input";
		self.originPackets.push({
			"updateTime": data.updateTime,
			"nodeId": data.nodeId.value,
			"dstNodeId": data.dstNodeId.value,
			"RSSI": data.RSSI.value,
			"frameType": data.frameType.value,
			"value": data.value
		});

		data = createIncomingEntry(data);
		data.id = data.updateTime * 1000 + (new Date).getMilliseconds();

		self.parsedPackets.push(data);
	};

	var outH = function (type) {
		var data = this;
		
		if (type === self.ZWAY_DATA_CHANGE_TYPE["Deleted"]) return;
		
		data.direction = "output";
		self.originPackets.push({
			"updateTime": data.updateTime,
			"delivered": data.delivered.value,
			"deliveryTime": data.deliveryTime.value,
			"packetLength": data.packetLength.value,
			"nodeId": data.nodeId.value,
			"returnRSSI": data.returnRSSI.value,
			"hops": data.hops.value,
			"returnChannel": data.returnChannel.value,
			"txChannel": data.txChannel.value,
			"speed": data.speed.value,
			"schemeState": data.schemeState.value,
			"tries": data.tries.value,
			"lastFailPath": data.lastFailPath.value,
			"value": data.value
		});

		data = createOutgoingEntry(data);
		data.id = data.updateTime * 1000 + (new Date).getMilliseconds();

		self.parsedPackets.push(data);
	};*/
/*
	// process incoming packages
	this.zway.controller.data.incomingPacket.bind(inH);
	// process outgoing packages
	this.zway.controller.data.outgoingPacket.bind(outH);*/

	// =================== helper functions ========================

	/*function RSSItoText(rssiValue) {
		if (rssiValue === 125) return "too low";
		if (rssiValue === 126) return "too high";
		if (rssiValue === 127) return "";
		if (rssiValue > 10 && rssiValue < 128) return "invalid";
		if (rssiValue > 127) rssiValue -= 256;
		return rssiValue.toString(10) + ' dBm';
	}

	function packetApplication(packet, packetType) {
		var encaps = [
				{ cc: 0x60, cmd: 0x0D, head: 4, tail: 0, srcI: 2, dstI: 3, encap:  'I' }, // MultiChannel
				{ cc: 0x60, cmd: 0x06, head: 3, tail: 0, srcI: 0, dstI: 2, encap:  'I' }, // MultiInstance
				{ cc: 0x6C, cmd: 0x01, head: 4, tail: 0, srcI: 0, dstI: 0, encap: 'Su' }, // Supervision
				{ cc: 0x8F, cmd: 0x01, head: 2, tail: 0, srcI: 0, dstI: 0, encap:  'M' }, // MultiCommand
				{ cc: 0x98, cmd: 0x81, head: 0, tail: 0, srcI: 0, dstI: 0, encap:  'S' }, // Security
				{ cc: 0x98, cmd: 0xC1, head: 0, tail: 0, srcI: 0, dstI: 0, encap:  'S' }, // Security
				{ cc: 0x9F, cmd: 0x03, head: 0, tail: 0, srcI: 0, dstI: 0, encap: 'S2' }, // Security S2
				{ cc: 0x56, cmd: 0x01, head: 2, tail: 2, srcI: 0, dstI: 0, encap:  'C' }  // CRC16
			],
			result = {
				src: packetType === 'in' ? packet.nodeId.value : self.zway.controller.data.nodeId.value,
				dst: packetType === 'in' ? packet.dstNodeId.value : packet.nodeId.value,
				encap: '',
				application: ''
			};

		if (packetType === 'in' && packet.frameType.value === "Node Info") {
			result.application = 'NIF (' + packet.value.slice(3).map(decToHex).join(', ') + ')';
			return result;
		}

		var payload = packet.value.slice(packetType === 'in' ? 0 : 4, packetType === 'in' ? undefined : -1);

		var multiCmd = false;

		var decapsulated = true;
		while (decapsulated) {
			decapsulated = false;
			for (var i = 0; i < encaps.length; i++) {
				if (payload[0] === encaps[i].cc && payload[1] === encaps[i].cmd) {
					// get channels
					if (encaps[i].dstI !== 0 && encaps[i].srcI !== 0) {
						result.dst += ":" + payload[encaps[i].dstI];
						result.src += ":" + payload[encaps[i].srcI];
					} else if (encaps[i].dstI !== 0) {
						// in MultiInstance v1 there is only remote side channel ID
						if (packetType === 'in') {
							result.src += ":" + payload[encaps[i].dstI];
						} else {
							result.dst += ":" + payload[encaps[i].dstI];
						}
					}
					// get inner payload
					if (encaps[i].head === 0) {
						// work with decrypted packet
						payload = packet.securePayload.value;
					} else {
						payload = payload.slice(encaps[i].head, encaps[i].tail === 0 ? undefined : -encaps[i].tail);
					}
					result.encap = result.encap + " " + encaps[i].encap;
					if (encaps[i].cc === 0x8F) {
						multiCmd = true;
						decapsulated = false;
					} else {
						decapsulated = true; // try next decapsulation
					}
					break;
				}
			}
		}

		if (multiCmd) {
			var n = payload[0];
			var s = 2;
			for (var j = 0; j < n; j++) {
				result.application += (j ? ', ' : '') + decodePayload(payload.slice(s, s + payload[s - 1]));
				s += payload[s - 1] + 1;
			}
		} else {
			result.application = decodePayload(payload);
		}
		return result;
	}

	function decodePayload(payload) {
		if (payload.length == 0) {
			return "";
		}

		var ccId = "0x" + decToHex(payload[0]);

		// match CC
		var findCmdClass = _.filter(self.cmdClasses, function (cc){
			return cc['_key'] === ccId;
		});

		// get latest version of filtered
		var latestVersion = Math.max.apply(Math, findCmdClass.map(function(cc) { return parseInt(cc['_version'], 10); })).toString();

		// match CC of the last version
		var _cmdClass = _.filter(findCmdClass, function (cc) {
			return cc['_version'] === latestVersion;
		})[0];

		if (!_cmdClass || _.isEmpty(_cmdClass)) {
			return 'Unknow commad (' + payload.map(decToHex).join(', ') + ')';
		}

		if (payload.length == 1) {
			return _cmdClass['_help'];
		}

		var ccCmd = "0x" + decToHex(payload[1]);

		var cmd;
		if (_.isArray(_cmdClass.cmd)) {
			cmd = _.filter(_cmdClass.cmd, function (cmd) {
				return cmd['_key'] === ccCmd;
			})[0];
		} else {
			cmd = _cmdClass.cmd;
		}

		var description = "Unknow command";

		if (typeof cmd === "object" && cmd.hasOwnProperty('_help') && cmd['_help'] !== '') {
			description = cmd['_help'];
			payload = payload.slice(2);
		} else if (_cmdClass['_help'] && _cmdClass['_help'] !== '') {
			description = _cmdClass['_help'];
			payload = payload.slice(1);
		}

		return description + (payload.length ? ' (' + payload.map(decToHex).join(', ') + ')' : '');
	}


	function decToHex(decimal) {
		return ("00" + decimal.toString(16).toUpperCase()).slice(-2);
	}

	function createIncomingEntry(packet) {
		var pA = packetApplication(packet, 'in');
		return {
			type: 'incoming',
			updateTime: packet.updateTime,
			src: pA.src,
			dest: pA.dst,
			rssi: packet.RSSI && packet.RSSI.value ? prepareRSSI(packet.RSSI.value) : '',
			encaps: pA.encap,
			application: pA.application
		};
	}

	function createOutgoingEntry(packet) {
		var pA = packetApplication(packet, 'out');
		return {
			type: 'outgoing',
			updateTime: packet.updateTime,
			speed: packet.speed && packet.speed.value ? packet.speed.value : '',
			rssi: packet.returnRSSI && packet.returnRSSI.value ? prepareRSSI(packet.returnRSSI.value) : '',
			hops: packet.hops && packet.hops.value ? packet.hops.value : '',
			tries: packet.tries && packet.tries.value ? packet.tries.value : '',
			src: pA.src,
			dest: pA.dst,
			rssi: packet.RSSI && packet.RSSI.value ? prepareRSSI(packet.RSSI.value) : '',
			encaps: pA.encap,
			application: pA.application
		};
	}*/
};

Zniffer.prototype.terminating = function () {
	console.log("Terminating Zniffer ... ");
	if (!this.stopped) {
		console.log("Terminating Zniffer binding");
		try {
			this.zniffer.terminate();
			this.zniffer = null;
		} catch(e) {
			// Zniffer has already gone
		}
		//remove logger intervall
		this.removeInterval();
	}
};

Zniffer.prototype.startZnifferBinding = function (frequency) {
	var self = this,
		freq = frequency && ['EU','US','ANZ','HK','TF1 EU','TF2 EU','TF3 US','TF4 US','MY','IN','JP','TF5','TF6','TF7','TF8 CH3','TF9 CH3','TF10 CH3','TF11 CH3','RU','IL'].indexOf(frequency) > -1? frequency : this.config.defaultFrequency;

	// initialize logger intervall
	this.comLoggerInterval = null;
	
	// store parsed incoming and outgoing packets (for Zniffer)
	this.parsedZnifferPackets = new LimitedArray(
		loadObject("parsedZnifferPackets.json"),
		function(arr) {
			saveObject("parsedZnifferPackets.json", arr);
		},
		25, // check it every 100 packets
		100, // save up to 5000 packets
		function(element) { // save last day only
			return element.id > ((new Date()).getTime() - 86400*1000);
		}
	);
	
	// store incoming and outgoing packets as they are (for PacketLog)
	this.znifferPackets = new LimitedArray(
		loadObject("originZnifferPackets.json"),
		function(arr) {
			saveObject("originZnifferPackets.json", arr);
		},
		25, // check it every 100 packets
		100, // save up to 5000 packets
		function(element) { // save last day only
			return element.updateTime > ((new Date()).getTime()/1000 - 86400);
		}
	);

	try {
		this.zniffer = new ZNifferBinding("zniffer",
			this.config.port,
			freq, { 
				terminationCallback: function() {
					self.terminating.call(self);
				}
			});

		this.defineHandlers();
		this.externalAPIAllow();
		global["ZnifferAPI"] = this.ZnifferAPI;

	} catch (e) {
		try {
			console.log("terminate binding ...");
			this.zniffer.terminate();
		} catch(e) {
			// Zniffer has already gone
		}
		this.zniffer = null;
		self.addNotification("error", this.langFile.err_init + e.toString(), "module");
		return;
	}

	this.stopped = false;

};

Zniffer.prototype.stopZnifferBinding = function () {	
	// clear limited arrays
	if (this.parsedZnifferPackets) {
		this.parsedZnifferPackets.finalize();
		this.parsedZnifferPackets = null;
	}
	if (this.znifferPackets) {
		this.znifferPackets.finalize();
		this.znifferPackets = null;
	}

	this.stopped = true;
	if (this.zniffer) {
		try {
			console.log("terminate binding ...");
			this.zniffer.terminate();
		} catch(e) {
			// Zniffer has already gone
		}
		this.zniffer = null;
	}

	//remove logger intervall
	this.removeInterval();
};

Zniffer.prototype.removeInterval = function() {
	//remove logger intervall
	if (this.comLoggerInterval){
		console.log("remove interval ...");
		clearInterval(this.comLoggerInterval);
		this.comLoggerInterval = null;
	}
}

// --------------- Public HTTP API -------------------

Zniffer.prototype.externalAPIAllow = function () {

	ws.allowExternalAccess("ZnifferAPI", this.controller.auth.ROLE.ADMIN);
	ws.allowExternalAccess("ZnifferAPI.Start", this.controller.auth.ROLE.ADMIN);
	ws.allowExternalAccess("ZnifferAPI.Stop", this.controller.auth.ROLE.ADMIN);
	ws.allowExternalAccess("ZnifferAPI.Fetch", this.controller.auth.ROLE.ADMIN);
	ws.allowExternalAccess("ZnifferAPI.RestartBinding", this.controller.auth.ROLE.ADMIN);
	ws.allowExternalAccess("ZnifferAPI.ChangeFrequency", this.controller.auth.ROLE.ADMIN);
	ws.allowExternalAccess("ZnifferAPI.TerminateBinding", this.controller.auth.ROLE.ADMIN);
};

Zniffer.prototype.externalAPIRevoke = function () {

	ws.revokeExternalAccess("ZnifferAPI");
	ws.revokeExternalAccess("ZnifferAPI.Start");
	ws.revokeExternalAccess("ZnifferAPI.Stop");
	ws.revokeExternalAccess("ZnifferAPI.Fetch");
	ws.revokeExternalAccess("ZnifferAPI.RestartBinding");
	ws.revokeExternalAccess("ZnifferAPI.ChangeFrequency");
	ws.revokeExternalAccess("ZnifferAPI.TerminateBinding");
};

Zniffer.prototype.defineHandlers = function () {
	var self = this,
		zniffer = this.zniffer;

	this.ZnifferAPI = function () {
		return {status: 400, body: "Bad ZnifferAPI request "};
	};

	this.ZnifferAPI.Start = function () {
		var result = {};

		if (zniffer) {
			try {
				zniffer.start();

				if (!self.comLoggerInterval){
					self.comLoggerInterval = setInterval(function(){
						self.CommunicationLogger();
					}, 3000);
				}

				result = self.prepareResult({
					code: 200,
					message: "200 OK"
				});

			} catch (e) {
				result = self.prepareResult({
					error: e.toString()
				});
				console.log('### Zniffer start error:', e.toString());
			}
		} else {
			result = self.prepareResult({
				error: "Zniffer is not initialized correctly."
			});
		}
		
		return result;
	};

	this.ZnifferAPI.Stop = function () {
		var result = {};

		if (zniffer) {
			try {
				console.log("pause zniffer ...");
				zniffer.stop();

				//remove logger intervall
				self.removeInterval();

				result = self.prepareResult({
					code: 200,
					message: "200 OK"
				});
				
			} catch (e) {
				result = self.prepareResult({
					error: e.toString()
				});
				console.log('### Zniffer stop error:', e.toString());
			}
		} else {
			result = self.prepareResult({
				error: "Zniffer is not initialized correctly."
			});
		}

		return result;
	};

	this.ZnifferAPI.Fetch = function (url) {
		var result = {},
			packets = [],
			timestamp = parseInt(url.substring(1), 10) || 0;

		if (zniffer) {
			try {
				packets = zniffer.fetch(timestamp);

				result = self.prepareResult({
					code: 200,
					message: "200 OK",
					data: packets
				});

				
			} catch (e) {
				result = self.prepareResult({ 
					error: e.toString() 
				});
				console.log('### Zniffer fetch error:', e.toString());
			}
		} else {
			result = self.prepareResult({
				error: "Zniffer is not initialized correctly."
			});
		}

		return result;
	};

	/*this.ZnifferAPI.Zniffer = function() {
		var body = {
				"code": 200,
				"message": "200 OK",
				"updateTime": null,
				"data": []
			};

		// TODO(!!!) may be report only updates since last body.updateTime ?
		body.data = _.filter(self.parsedPackets.get(), function(p) {
			return p.id > ((new Date()).getTime() - 10000);
		});

		body.updateTime = Math.round((new Date()).getTime() / 1000);
		body.data.reverse(); // newer on top

		return self.prepareResult(body);
	};

	this.ZnifferAPI.PacketLog = function() {
		return self.prepareResult({
			"code": 200,
			"message": "200 OK",
			"updateTime": Math.round((new Date()).getTime() / 1000),
			data: self.originPackets.get()
		});
	};
*/
	this.ZnifferAPI.RestartBinding = function() {
		var result = {};

		try {
			self.stopZnifferBinding();

			self.startZnifferBinding();

			result = self.prepareResult({
				code: 200,
				message: "200 OK"
			});
			
		} catch (e) {
			result = self.prepareResult({ 
				error: e.toString() 
			});
			console.log('### Zniffer Restart error:', e.toString());
		}

		return result;
	};

	this.ZnifferAPI.ChangeFrequency = function(url, request) {
		var result = {},
			allowedfrequency = false,
			frequency;

		if (request.query && request.query.hasOwnProperty("frequency")) {
			allowedfrequency = ['EU','US','ANZ','HK','TF1 EU','TF2 EU','TF3 US','TF4 US','MY','IN','JP','TF5','TF6','TF7','TF8 CH3','TF9 CH3','TF10 CH3','TF11 CH3','RU','IL'].indexOf(request.query.frequency) > -1;
			frequency = allowedfrequency? request.query.frequency : frequency;
			console.log('### frequency:', frequency);
		}

		try {
			self.stopZnifferBinding();

			self.startZnifferBinding(frequency);

			result = self.prepareResult({
				code: 200,
				message: "200 OK"
			});
			
		} catch (e) {
			result = self.prepareResult({ 
				error: e.toString() 
			});
			console.log('### Zniffer Restart error:', e.toString());
		}

		return result;
	};

	this.ZnifferAPI.TerminateBinding = function () {
		var result = {};

		if (zniffer) {
			try {
				self.stopZnifferBinding();

				result = self.prepareResult({
					code: 200,
					message: "200 OK"
				});
				
			} catch (e) {
				result = self.prepareResult({
					error: e.toString()
				});
				console.log('### Zniffer terminate binding error:', e.toString());
			}
		} else {
			result = self.prepareResult({
				error: "Zniffer is not initialized correctly."
			});
		}

		return result;
	};
}

Zniffer.prototype.prepareResult = function(body) {
	var result = {},
		ret = {
			status: 500,
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
				"Access-Control-Allow-Headers": "Authorization",
				"Content-Type": "application/json",
				"Connection": "keep-alive"
			},
			body: {
				code: 500,
				message: "500 Something went wrong.",
				error: null,
				data: null
			}
		};

	return body? _.extend(ret, { status: body.code? body.code : ret.status, body: body	}) : ret;
}