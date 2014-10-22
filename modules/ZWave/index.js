/*** Z-Wave Binding module ********************************************************

Version: 2.0.0
-------------------------------------------------------------------------------
Author: Serguei Poltorak <ps@z-wave.me>
Copyright: (c) Z-Wave.Me, 2014

******************************************************************************/

function ZWave (id, controller) {
    ZWave.super_.call(this, id, controller);
}

// Module inheritance and setup

inherits(ZWave, AutomationModule);

_module = ZWave;

ZWave.prototype.init = function (config) {
    ZWave.super_.prototype.init.call(this, config);

    var self = this;
    
    try {
	    this.zway = new ZWaveBinding(this.config.name, this.config.port, {
		configFolder: this.config.config || 'config',
		translationsFolder: this.config.translations || 'translations',
		zddxFolder: this.config.ZDDX || 'ZDDX',
		terminationCallback: function() {
		    self.terminating.call(self);
		}
	    });
    } catch(e) {
    	this.controller.addNotification("critical", "Can not start Z-Wave binding: " + e.toString(), "z-wave");
    	this.zway = null;
    	return;
    }
    
    this.zway.discover();
    
    zway = this.zway;
    
    this.defineHandlers();

    // TODO: these paths needs to be fixed in future to allow multiple Z-Way running. Also check z-way-utils to allow them to work in multi-stick environment.

    ZWaveAPI = this.ZWaveAPI; // make it global
    
    // Init Z-Wave API url handlers
    ws.allowExternalAccess("ZWaveAPI");
    ws.allowExternalAccess("ZWaveAPI.Run");
    ws.allowExternalAccess("ZWaveAPI.Data");
    ws.allowExternalAccess("ZWaveAPI.InspectQueue");
    ws.allowExternalAccess("ZWaveAPI.Backup");
    ws.allowExternalAccess("ZWaveAPI.Restore");
    ws.allowExternalAccess("ZWaveAPI.CreateZDDX");
    ws.allowExternalAccess("ZWaveAPI.CommunicationStatistics");
};

ZWave.prototype.stop = function () {
    console.log("--- ZWave.stop()");
    ZWave.super_.prototype.stop.call(this);

    ws.revokeExternalAccess("ZWaveAPI");
    ws.revokeExternalAccess("ZWaveAPI.Run");
    ws.revokeExternalAccess("ZWaveAPI.Data");
    ws.revokeExternalAccess("ZWaveAPI.InspectQueue");
    ws.revokeExternalAccess("ZWaveAPI.Backup");
    ws.revokeExternalAccess("ZWaveAPI.Restore");
    ws.revokeExternalAccess("ZWaveAPI.CreateZDDX");
    ws.revokeExternalAccess("ZWaveAPI.CommunicationStatistics");

    this.communicationStatistics = null;
    this.ZWaveAPI = null;

    ZWaveAPI = null; // delete global
    delete ZWaveAPI;
    
    this.stopped = true;
    this.zway.stop();
    this.zway = null;
    zway = null;
};

ZWave.prototype.terminating = function () {
    if (!this.stopped) {
    	console.log("Terminating Z-Wave binding");
    	this.zway = null;
    	zway = null;
    }
};

ZWave.prototype.defineHandlers = function () {
	var zway = this.zway; // use own zway object (for multiple sticks)
	
	this.ZWaveAPI = function() {
	    return { status: 400, body: "Bad ZWaveAPI request" };
	};

	this.ZWaveAPI.Run = function(url) {
	    url = "zway." + url.substring(1);
	    try {
		var r = eval(url);
		return { 
			status: 200, 
			headers: { 
				"Content-Type": "application/json",
				"Connection": "keep-alive"
			},
			body: r 
		};
	    } catch (e) {
		return { status: 500, body: e.toString() };
	    }
	};

	this.ZWaveAPI.Data = function(url) {
		var timestamp = parseInt(url.substring(1)) || 0;
		return {
			status: 200,
			headers: { 
				"Content-Type": "application/json",
				"Connection": "keep-alive"
			},
			body: zway.data(timestamp)    	
		};
	};

	this.ZWaveAPI.InspectQueue = function(url) {
		return {
			status: 200,
			headers: { 
				"Content-Type": "application/json",
				"Connection": "keep-alive"
			},
			body: zway.InspectQueue()    	
		};
	};

	this.ZWaveAPI.Backup = function(url) {
		var now = new Date();
		
		// create a timestamp in format yyyy-MM-dd-HH-mm
		var ts = now.getFullYear() + "-";
		ts += ("0" + (now.getMonth()+1)).slice(-2) + "-";
		ts += ("0" + now.getDate()).slice(-2) + "-";
		ts += ("0" + now.getHours()).slice(-2) + "-";
		ts += ("0" + now.getMinutes()).slice(-2);
		
		try {
			var data = zway.controller.Backup();
			return {
				status: 200,
				headers: {
					"Content-Type": "application/x-download",
					"Content-Disposition": "attachment; filename=z-way-backup-" + ts + ".zbk",
					"Connection": "keep-alive"
				},
				body: data
			}
		} catch (e) {
			return { status: 500, body: e.toString() };
		}
	};

	this.ZWaveAPI.Restore = function(url, request) {
		if (request.method == "POST" && request.data && request.data && request.data.config_backup) {
			var full = false;
			if (request.query && request.query.hasOwnProperty("restore_chip_info")) {
				var rci = request.query["restore_chip_info"];
				full = (rci == "yes" || rci == "true" || rci == "1");
			}
			
			var file = request.data.config_backup;
			if (file instanceof Array)
				file = file[0];
			if (file.name && file.content && file.length > 0) {
				// valid file object detected
				try {
					zway.controller.Restore(file.content, full);
					return {
						status: 200,
						headers: {
							"Content-Type": "application/json",
							"Connection": "keep-alive"
						},
						body: null
					}
				} catch (e) {
					return { status: 500, body: e.toString() };
				}
			}
		}
		return { status: 400, body: "Invalid request" };
	};

	this.ZWaveAPI.CreateZDDX = function(url, request) {
		function hexByteToStr(n) {
			return ("00" + parseInt(n).toString(16)).slice(-2);
		}

		function hexWordToStr(n) {
			return ("0000" + parseInt(n).toString(16)).slice(-4);
		}

		function tagAttrValue(name, value) {
			return	{
				"name": name,
				"attributes": {
					"value": value
				}
			};
		}

		function tagByte(name, value) {
			return tagAttrValue(name, hexByteToStr(value));
		}

		function tagWord(name, value) {
			return tagAttrValue(name, hexWordToStr(value));
		}

		function tagBool(name, value) {
			return tagAttrValue(name, value ? "true": "false");
		}

		function tagText(name, value) {
			return	{
				"name": name,
				"text": value
			};
		}

		function tagLangs(name, values) {
			var
				lang,
				langChildren = [];

			for (lang in values) {
				langChildren.push({
					"name": "lang",
					"attributes": {
						"xml:lang": lang
					},
					"text": values[lang]
				});
			}

			return {
				"name": name,
				"children": langChildren
			};
		}

		function inNIF(id, nif, afterMark) {
			var
				ccId,
				markFound = false;
			
			id = parseInt(id);
			for (i in nif) {
				if (nif[i] === 0xEF) {
					markFound = true;
				}
				
				if (!(afterMark ^ markFound) && parseInt(nif[i]) === id) {
					return true;
				}
			}
			return false;	
		}

		function tagCC(id, version, supported, secure, nif) {
			return {
				"name": "commandClass",
				"attributes": {
					"id": hexWordToStr(id),
					"version": version,
					"supported": supported || inNIF(id, nif, false),
					"controlled": !supported || inNIF(id, nif, true),
					"secure": secure,
					"inNIF": (supported && inNIF(id, nif, false)) || (!supported && inNIF(id, nif, true))
				}
			};
		}

		var	nodeId = url.split("/")[1],
			d = zway.devices[nodeId],
			zddx = new ZXmlDocument();
			
		zddx.root = {
			"name": "ZWaveDevice",
			"attributes": {
				"xmlns": "http://www.pepper1.net/zwavedb/xml-schemata/z-wave",
				"schemaVersion": "2"
			},
			"children": [
				{
					"name": "descriptorVersion",
					"text": "1"
				},
				{
					"name": "deviceData",
					"children": [
						tagWord("manufacturerId", d.data.manufacturerId.value),
						tagWord("productType", d.data.manufacturerProductType.value),
						tagWord("productId", d.data.manufacturerProductId.value),
						tagByte("libType", d.data.ZWLib.value),
						tagByte("protoVersion", d.data.ZWProtocolMajor.value),
						tagByte("protoSubVersion", d.data.ZWProtocolMinor.value),
						tagByte("appVersion", d.data.applicationMajor.value),
						tagByte("appSubVersion", d.data.applicationMinor.value),
						tagByte("basicClass", d.data.basicType.value),
						tagByte("genericClass", d.data.genericType.value),
						tagByte("specificClass", d.data.specificType.value),
						tagBool("optional", d.data.optional.value),
						tagBool("listening", d.data.isListening.value),
						tagBool("routing", d.data.isRouting.value),
						tagText("beamSensor", d.data.sensor250.value ? "250" : (d.data.sensor1000.value ? "1000" : "0")),
					]
				},
				{
					"name": "deviceDescription",
					"children": [
						tagLangs("description", {"en": ""}),
						tagLangs("wakeupNote", {"en": ""}),
						tagLangs("inclusionNote", {"en": ""}),
						tagText("productName", ""),
						tagText("brandName", ""),
						tagText("productVersion", d.data.applicationMajor.value.toString()  + "." + d.data.applicationMinor.value.toString())
					]
				},
				{
					"name": "commandClasses",
					"children": (function() {
						var
							ccId,
							arr = [],
							ccs = d.instances[0].commandClasses;
						
						for(ccId in ccs) {
							arr.push(tagCC(ccId, ccs[ccId].data.version.value, ccs[ccId].data.supported.value, ccs[ccId].data.security.value, d.data.nodeInfoFrame.value));
						};
						for(n in d.data.nodeInfoFrame.value) {
							var ccId = d.data.nodeInfoFrame.value[n];
							if (!ccs[ccId] && ccId != 0xEF) {
								arr.push(tagCC(ccId, 1, false, false, d.data.nodeInfoFrame.value));
							}
						};
						
						return arr;
					})()
				}
			]
		};
		
		if (d.instances[0].Association) {
			console.logJS(zddx.root.children);
			zddx.root.insertChild({
				"name": "assocGroups",
				"children": (function(data) {
					var
						n,
						Assocs = [];
					
					for (n = 1; n <= data.groups.value; n++) {
						Assocs.push({
							"name": "assocGroup",
							"attributes": {
								"number": n,
								"maxNodes": data[n].max.value
							},
							"children": [
								tagLangs("description", {"en": "Group " + n.toString()})
							]
						});
					}
					
					return Assocs;
				})(d.instances[0].Association.data)
			});
			console.logJS(zddx.root.children);
		}
		
		return {
			"status": 200,
			"body": zddx.toString(),
			"headers": {
				"Content-Type": "application/xml"
			}
		};
	};

	function CommunicationStatistics(zway) {
		this.MAX_ARRAY_LENGTH = 30;

		this.ZWAY_DEVICE_CHANGE_TYPES = {
			"DeviceAdded": 0x01,
			"DeviceRemoved": 0x02,
			"InstanceAdded": 0x04,
			"InstanceRemoved": 0x08,
			"CommandAdded": 0x10,
			"CommandRemoved": 0x20,

			"ZDDXSaved": 0x100,        // this callback notifies on ZDDX data change (to allow main program to purge buffers to disk/flash). For this event node_id = instance_id = command_id = 0
			"EnumerateExisting": 0x200 // this flag makes callback immediately fire for all existing devices/instances/command classes as if they're just added
		};


		this.ZWAY_DATA_CHANGE_TYPE = {
			"Updated": 0x01,	   // Value updated or child created
			"Invalidated": 0x02,   // Value invalidated
			"Deleted": 0x03,	   // Data holder deleted - callback is called last time before being deleted
			"ChildCreated": 0x04,  // New direct child node created

			// ORed flags
			"PhantomUpdate": 0x40, // Data holder updated with same value (only updateTime changed)
			"ChildEvent": 0x80	 // Event from child node
		};

		this.zway = null;
		this.zwayBinding = null;
		this.devicesBindings = {};
		this.communicationStatistics = {};

		this.init(zway);
	}

	CommunicationStatistics.prototype.init = function(zway) {
		var self = this;

		if (!zway || this.zwayBinding)
			return;

		this.zway = zway;
		this.zwayBinding = this.zway.bind(function(type, nodeId) {
			if (type === self.ZWAY_DEVICE_CHANGE_TYPES["DeviceAdded"]) {
				self.attach(nodeId);
			}
		}, this.ZWAY_DEVICE_CHANGE_TYPES["DeviceAdded"] || this.ZWAY_DEVICE_CHANGE_TYPES["EnumerateExisting"]);
	};

	CommunicationStatistics.prototype.attach = function(nodeId) {
		if (!this.zway || !this.zwayBinding || !this.zway.devices[nodeId] || this.devicesBindings[nodeId])
			return;

		this.communicationStatistics[nodeId] = [];
		this.devicesBindings[nodeId] = this.zway.devices[nodeId].data.lastPacketInfo.bind(this.handler, {self: this, nodeId: nodeId}, false);
	};

	CommunicationStatistics.prototype.handler = function(type, args, self) {
		args.self.communicationStatistics[args.nodeId].push({
			"date": (new Date()).getTime(),
			"delivered": this.delivered.value,
			"packetLength": this.packetLength.value,
			"deliveryTime": this.deliveryTime.value
		});
		args.self.communicationStatistics[args.nodeId].splice(0, Math.max(args.self.communicationStatistics[args.nodeId].length - args.self.MAX_ARRAY_LENGTH, 0));
	};

	CommunicationStatistics.prototype.stop = function() {
		var self = this;

		if (!this.zway || !this.zwayBinding)
			return;

		this.zway.unbind(this.zwayBinding);
		this.zwayBinding = null;

		Object.keys(this.devicesBindings).forEach(function(nodeId) {
			self.this.zway.devices[nodeId].data.lastPacketInfo.unbind(self.devicesBindings[nodeId]);
		});
		this.devicesBindings = {};
		
		this.communicationStatistics = {};
		
		this.zway = null;
	};

	CommunicationStatistics.prototype.get = function() {
		return this.communicationStatistics;
	};

	this.communicationStatistics = new CommunicationStatistics(this.zway);
	this.ZWaveAPI.CommunicationStatistics = (function(that) {
		return function() {
			return that.communicationStatistics.get();
		};
	})(this);
};	
