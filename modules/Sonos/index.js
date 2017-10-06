/*** Sonos Z-Way HA module *******************************************

 Version: 1.2.3
 (c) Z-Wave.Me, 2017
 -----------------------------------------------------------------------------
 Author: Poltorak Serguei <ps@z-wave.me>
 Modified by: Martin Petzold <mp@zwave.eu>, Niels Roche <nir@zwave.eu>, Karsten Reichel <kar@zwave.eu>
 Description:
 Implements Sonos support
 ******************************************************************************/

/*

 TODO

 Add periodic M-SEARCH if needed
 */

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function Sonos (id, controller) {
	// Call superconstructor first (AutomationModule)
	Sonos.super_.call(this, id, controller);

	this.players = [];
	this.subscribeTimer = [];
	this.hostnames = {};
}

inherits(Sonos, AutomationModule);

_module = Sonos;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

Sonos.prototype.init = function (config) {
	Sonos.super_.prototype.init.call(this, config);

	var self = this;

	this.householdFinder();
	this.playersFinder();
	this.notifier();

	this.config.households.forEach(function(household) {
		self.playersFinderLookup(household);
	});
};

Sonos.prototype.stop = function () {
	var self = this;

	this.sockHouseholdFinder && this.sockHouseholdFinder.close();
	this.sockHouseholdFinder = null;
	this.sockPlayerFinder && this.sockPlayerFinder.close();
	this.sockPlayerFinder = null;
	this.sockNotifier && this.sockNotifier.close();
	this.sockNotifier = null;

	this.players.forEach(function(player) {
		self.controller.devices.remove('Sonos_Device_' + player.host + '_' + this.id);
		self.controller.devices.remove('Sonos_Device_Play_' + player.host + '_' + self.id);
		self.controller.devices.remove('Sonos_Device_Volume_' + player.host + '_' + self.id);
		self.controller.devices.remove('Sonos_Device_Previous_' + player.host + '_' + self.id);
		self.controller.devices.remove('Sonos_Device_Next_' + player.host + '_' + self.id);
	});

	this.subscribeTimer.forEach(function(timer) {
		clearInterval(timer);
	});

	Sonos.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

Sonos.prototype.householdFinder = function () {
	var self = this;

	var sockHouseholdFinder = new sockets.udp();
	sockHouseholdFinder.reusable();
	sockHouseholdFinder.bind('255.255.255.255', 6969);
	sockHouseholdFinder.onrecv = function(data, host, port) {
		var arr = new Uint8Array(data);

		var pos = 4;
		pos += 1 + arr[pos];
		pos += 9;
		pos += 1 + arr[pos];
		pos += 2;

		var household = String.fromCharCode.apply(null, arr.subarray(pos + 1, pos + 1 + arr[pos]));

		if (self.config.households.filter(function(el) { return el == household; }).length === 0) {
			console.log('Detected Sonos Household:', household);
			self.config.households.push(household);
			self.saveConfig();
			self.playersFinderLookup(household);
		}
	};
	sockHouseholdFinder.listen();
	console.log('Waiting for Sonos to send announcement');

	this.sockHouseholdFinder = sockHouseholdFinder;
};

Sonos.prototype.playersFinder = function () {
	var self = this;

	var sockPlayerFinder = new sockets.udp();
	sockPlayerFinder.reusable();
	sockPlayerFinder.onrecv = function(data, host, port) {
		var msg = String.fromCharCode.apply(null, new Uint8Array(data));
		var header_loc = 'LOCATION: ';
		var headers_loc = msg.split('\r\n').filter(function(str) { return str.slice(0, header_loc.length) == header_loc; });
		var header_hh = 'X-RINCON-HOUSEHOLD: ';
		var headers_hh = msg.split('\r\n').filter(function(str) { return str.slice(0, header_hh.length) == header_hh; });
		if (headers_loc.length && headers_hh.length) {
			var url = headers_loc[0].slice(header_loc.length),
				_household = headers_hh[0].slice(header_hh.length);
			self.checkPlayer(_household, host, url);
		}
	};
	sockPlayerFinder.listen();

	this.sockPlayerFinder = sockPlayerFinder;
};

Sonos.prototype.playersFinderLookup = function (household) {
	this.sockPlayerFinder.sendto('M-SEARCH * HTTP/1.1\r\nHOST: 239.255.255.250:1900\r\nMAN: "ssdp:discover"\r\nMX: 1\r\nST: urn:schemas-upnp-org:device:ZonePlayer:1\r\nX-RINCON-HOUSEHOLD: ' + household + '\r\n\r\n', '239.255.255.250', 1900);
};

Sonos.prototype.checkPlayer = function(household, host, metadata) {
	var self = this;

	if (!this.hostnames[household]) {
		this.detectHostname(household, host);
	}

	if (this.players.filter(function (player) { return player.host == host; }).length) return; // this player was tested already
	this.players.push({
		household: household,
		host: host
	});

	http.request({
		url: metadata,
		async: true,
		method: 'GET',
		header: {
			'Content-Type': 'text/xml'
		},
		success: function(response) {
			var AVcaps = response.data.findOne('//t:controlURL[text()="/MediaRenderer/AVTransport/Control"]', {t: 'urn:schemas-upnp-org:device-1-0'});
			if (AVcaps) {
				console.log('Detected AV capable Sonos player on', host);
				self.renderPlayer(household, host);
			}
		},
		error: function(response) {
			console.log('Failed to fetch Sonos metadata from', host);
		}
	});
};

Sonos.prototype.detectHostname = function(household, host) {
	var self = this;

	var sockHost = new sockets.tcp();
	sockHost.onclose = function (remoteHost, remotePort, localHost, localPort) {
		if (localHost && self.hostnames[household] !== localHost) {
			console.log('Detected own hostname:', localHost);
			self.hostnames[household] = localHost;
		}
	};
	sockHost.onconnect = function(remoteHost, remotePort, localHost, localPort) {
		this.close();
	};
	sockHost.connect(host, 1400);
};

Sonos.prototype.renderPlayer = function(household, host) {
	var self = this;
	var vDevPlayer = self.controller.devices.create({
		deviceId: 'Sonos_Device_' + host + '_' + this.id,
		defaults: {
			deviceType: 'audioPlayer',
			customIcons: {},
			metrics: {
				title: 'Sonos ' + host + ' ' + this.id,
				icon: '/ZAutomation/api/v1/load/modulemedia/Sonos/icon.png',
				level: '0',
				pStatus:'Stop'
			}
		},
		overlay: {},
		handler: function (command, args) {
			var level=this.get('metrics:level');
			var levelOld=level;
			var pStatus=this.get('metrics:pStatus');
			var pStatusOld=pStatus;
			switch (command) {
				case 'on':
					pStatus = 'Play';
					break;
				case 'off':
					pStatus = 'Stop';
					break;
				case 'exact':
					level = parseInt(args.level, 10);
					break;
				case 'previous':
					self.action(host, 'Previous');
					break;
				case 'next':
					self.action(host, 'Next');
					break;
				case 'play':
					pStatus='Play';
					break;
				case 'pause':
					pStatus='Pause';
					break;
				case 'stop':
					pStatus='Stop';
					break;
			}
			if(level!==levelOld) {
				self.volume(host, level);
			}
			if(pStatus!==pStatusOld) {
				self.action(host, pStatus);
			}
		},
		moduleId: self.id
	});
	var vDevSwitch = self.controller.devices.create({
		deviceId: 'Sonos_Device_Play_' + host + '_' + self.id,
		defaults: {
			deviceType: 'switchBinary',
			customIcons: {},
			metrics: {
				title: 'Sonos Play ' + host + ' ' + self.id,
				icon: '/ZAutomation/api/v1/load/modulemedia/Sonos/icon.png'
			}
		},
		overlay: {},
		handler: function (command, args) {
			self.action(host, command === 'on' ? 'Play' : 'Pause');
		},
		moduleId: self.id
	});
	var vDevVolume = self.controller.devices.create({
		deviceId: 'Sonos_Device_Volume_' + host + '_' + self.id,
		defaults: {
			deviceType: 'switchMultilevel',
			customIcons: {},
			metrics: {
				title: 'Sonos Volume ' + host + ' ' + self.id,
				icon: '/ZAutomation/api/v1/load/modulemedia/Sonos/icon.png',
				probeType: 'multilevel'
			}
		},
		overlay: {},
		handler: function (command, args) {
			var level;
			if (command === 'on') level = 100;
			if (command === 'off') level = 0;
			if (command === 'exact') level = parseInt(args.level, 10);
			self.volume(host, level);
		},
		moduleId: self.id
	});

	var vDevPrevious = self.controller.devices.create({
	   deviceId: 'Sonos_Device_Previous_' + host + '_' + self.id,
	   defaults: {
			deviceType: 'toggleButton',
			customIcons: {},
			metrics: {
				title: 'Sonos Previous ' + host + ' ' + self.id,
				icon: '/ZAutomation/api/v1/load/modulemedia/Sonos/icon.png',
				level: 'on'
			}
		},
		overlay: {},
		handler: function (command, args) {
			self.action(host, 'Previous');
		},
		moduleId: self.id
	});

	var vDevNext = self.controller.devices.create({
		deviceId: 'Sonos_Device_Next_' + host + '_' + self.id,
		defaults: {
			deviceType: 'toggleButton',
			customIcons: {},
			metrics: {
				title: 'Sonos Next ' + host + ' ' + self.id,
				icon: '/ZAutomation/api/v1/load/modulemedia/Sonos/icon.png',
				level: 'on'
			}
		},
		overlay: {},
		handler: function (command, args) {
			self.action(host, 'Next');
		},
		moduleId: self.id
	});

	vDevVolume.set('visibility', false, {silent: true});
	vDevSwitch.set('visibility', false, {silent: true});
	vDevPrevious.set('visibility', false, {silent: true});
	vDevNext.set('visibility', false, {silent: true});    
	// subscribe to notifications
	this.subscribe(household, host);

	// repeat subscription every hour
	this.subscribeTimer.push(setInterval(function() {
		self.subscribe(household, host);
	}, 3600*1000));
};

Sonos.prototype.subscribe = function (household, host) {
	var self = this;

	[
		'/MediaRenderer/AVTransport/Event',
		'/MediaRenderer/RenderingControl/Event'
		/* we don't need these notifications
		 '/MediaServer/ContentDirectory/Event',
		 '/ZoneGroupTopology/Event',
		 '/AlarmClock/Event',
		 '/MusicServices/Event',
		 '/SystemProperties/Event',
		 '/MediaServer/ContentDirectory/Event',
		 */
	].map(function(subscriber) {
		var sock = new sockets.tcp();
		sock.onconnect = function() {
			this.send(
				"SUBSCRIBE " + subscriber +" HTTP/1.1\r\n" +
				"HOST: " + host + ":1400\r\n" +
				"USER-AGENT: Linux UPnP/1.0 Sonos/28.1-83040 (MDCR_MacBookPro11,1)\r\n" +
				"CALLBACK: <http://" + self.hostnames[household] + ":3400/notify>\r\n" +
				"NT: upnp:event\r\n" +
				"TIMEOUT: Second-3600\r\n"+
				"\r\n"
			);
			this.close();
		};
		sock.connect(host, 1400);
	});
};

Sonos.prototype.notifier = function () {
	var self = this;

	var sockNotifier = new sockets.tcp();
	sockNotifier.reusable();
	sockNotifier.bind(3400);
	sockNotifier.onconnect = function(host, port) {
		this.msg = '';
	};
	sockNotifier.onrecv = function(data, host, port) {
		this.msg += String.fromCharCode.apply(null, new Uint8Array(data));
		var indx = this.msg.indexOf('\r\n\r\n');
		if (indx != -1) {
			var header_len_str = 'CONTENT-LENGTH';
			var header = this.msg.slice(0, indx).split('\r\n');
			var header_len = header.filter(function(str) { return str.slice(0, header_len_str.length) === header_len_str; });
			if (header_len.length) {
				data_len = parseInt(header_len[0].split(':')[1], 10);
				data = this.msg.slice(indx + 4);
				if (data.length >= data_len) {
					// full message received
					this.send("HTTP/1.1 200 OK\r\nServer: Linux UPnP/1.0 Sonos/28.1-83040 (MDCR_MacBookPro11,1)\r\nConnection: close\r\n\r\n");
					this.close();

					var x = new ZXmlDocument(data);
					var lastChange = x.findOne('//LastChange/text()');
					if (lastChange) {
						lastChange = lastChange.replace(' xmlns=\"urn:schemas-upnp-org:metadata-1-0/RCS/\"', ''); // TODO: temp hack until we fix xmlns problem // fixed, but need time to redo this part
						lastChange = lastChange.replace(' xmlns=\"urn:schemas-upnp-org:metadata-1-0/AVT/\"', ''); // TODO: temp hack until we fix xmlns problem
						//self.controller.addNotification('error', JSON.stringify(lastChange, null, 4), 'module', 'Sonos');
						var vol = (new ZXmlDocument(lastChange)).findOne('/Event/InstanceID/Volume[@channel="Master"]/@val');

						var vDevPlayer = self.controller.devices.get('Sonos_Device_' + host + '_' + self.id);

						if (vol) {
							var vDevVolume = self.controller.devices.get('Sonos_Device_Volume_' + host + '_' + self.id);
							if (vDevVolume) {
								vDevVolume.set('metrics:level', parseInt(vol, 10));
							}
							if (vDevPlayer) {
								vDevPlayer.set('metrics:level', parseInt(vol, 10));
							}
						}
						var play = (new ZXmlDocument(lastChange)).findOne('/Event/InstanceID/TransportState/@val');
						if (play) {
							var vDevSwitch = self.controller.devices.get('Sonos_Device_Play_' + host + '_' + self.id);
							if (vDevSwitch) {
								vDevSwitch.set('metrics:level', play === 'PLAYING' ? 'on' : 'off');
							}

							if (vDevPlayer) {
								switch (play) {
									case 'PLAYING':
										vDevPlayer.set('metrics:pStatus', 'Play');
										break;
									case 'PAUSED_PLAYBACK':
										vDevPlayer.set('metrics:pStatus', 'Pause');
										break;
									case 'STOPPED':
										vDevPlayer.set('metrics:pStatus', 'Stop');
										break;
									default:
										vDevPlayer.set('metrics:pStatus', 'Stop');
										break;
								}
							}
						}
					}
				}
			}
		}
	};
	sockNotifier.listen();
	console.log('Binding Sonos notifier');

	this.sockNotifier = sockNotifier;
};

Sonos.prototype.action = function (host, action) {
	var self = this;
	http.request({
		async: true,
		headers: {
			'Content-Type': 'text/xml',
			'SOAPACTION': 'urn:schemas-upnp-org:service:AVTransport:1#' + action
		},
		url: 'http://' + host + ':1400/MediaRenderer/AVTransport/Control',
		method: 'POST',
		data: '\
			<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">\
				<s:Body>\
					<u:' + action + ' xmlns:u="urn:schemas-upnp-org:service:AVTransport:1">\
						<InstanceID>0</InstanceID>\
						<Speed>1</Speed>\
					</u:' + action + '>\
				</s:Body>\
			</s:Envelope>',

		success: function() {
			vDevPlayer = self.controller.devices.get('Sonos_Device_' + host + '_' + self.id);
			if (vDevPlayer) {
				vDevPlayer.set('metrics:pStatus', action);
			}

			var vDevSwitch = self.controller.devices.get('Sonos_Device_Play_' + host + '_' + self.id);
			if (vDevSwitch) {
				if (action == 'Play') {
					vDevSwitch.set('metrics:level', 'on');
				}
				else if (action == 'Stop' || action == 'Pause') {
					vDevSwitch.set('metrics:level', 'off');	
				}
			}
		},
		error: function(response) {
			console.log('Can not make request: ' + response.statusText);
		}
	});
};

Sonos.prototype.volume = function (host, level) {
	var self = this;
	http.request({
		async: true,
		headers: {
			'Content-Type': 'text/xml',
			'SOAPACTION': 'urn:schemas-upnp-org:service:RenderingControl:1#SetVolume'
		},
		url: 'http://' + host + ':1400/MediaRenderer/RenderingControl/Control',
		method: 'POST',
		data: '\
			<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">\
				<s:Body>\
					<u:SetVolume xmlns:u="urn:schemas-upnp-org:service:RenderingControl:1">\
						<InstanceID>0</InstanceID>\
						<Channel>Master</Channel>\
						<DesiredVolume>' + level + '</DesiredVolume>\
					</u:SetVolume>\
				</s:Body>\
			</s:Envelope>',
		success: function() {
			var vDevPlayer = self.controller.devices.get('Sonos_Device_' + host + '_' + self.id);
			if (vDevPlayer) {
				vDevPlayer.set('metrics:level', level);
			}

			var vDevVolume = self.controller.devices.get('Sonos_Device_Volume_' + host + '_' + self.id);
			if (vDevVolume) {
				vDevVolume.set('metrics:level', level);
			}
		},
		error: function(response) {
			console.log('Can not make request: ' + response.statusText);
		}
	});
};
