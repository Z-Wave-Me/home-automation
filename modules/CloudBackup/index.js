/*** CloudBackup Z-Way HA module *******************************************

 Version: 0.1.4 beta
 (c) Z-Wave.Me, 2016
 -----------------------------------------------------------------------------
 Author: Michael Hensche <mh@z-wave.eu>
 Description: Gives possibility to upload and store your backups on the remote server.

 ******************************************************************************/

function CloudBackup (id, controller) {
	// Call superconstructor first (AutomationModule)
	CloudBackup.super_.call(this, id, controller);
}

inherits(CloudBackup, AutomationModule);

_module = CloudBackup;

CloudBackup.prototype.init = function(config) {
	CloudBackup.super_.prototype.init.call(this, config);

	this.backupcreate_url = "http://192.168.10.108/cloudbackup/?uri=backupcreate"; // https://service.z-wave.me
	this.usercreate_url = "http://192.168.10.108/cloudbackup/?uri=usercreate";
	this.userupdate_url = "http://192.168.10.108/cloudbackup/?uri=userupdate";

	var self = this,
		langFile = self.loadModuleLang();

	// load remote_id
	try {
		this.remoteid = self.controller.getRemoteId();
		self.config.remoteid = this.remoteid;
	} catch(e) {
		console.log(e.message);
		return;
	}

	this.defineHandlers();
	this.externalAPIAllow();
	global["CloudBackupAPI"] = this.CloudBackupAPI;

	this.uploadBackup = function() {
		console.log("###### start Backup ");
		var ret = false;

		try {
			var backupJSON = self.controller.createBackup();

			var now = new Date();
			// create a timestamp in format yyyy-MM-dd-HH-mm
			var ts = now.getFullYear() + "-";
			ts += ("0" + (now.getMonth()+1)).slice(-2) + "-";
			ts += ("0" + now.getDate()).slice(-2) + "-";
			ts += ("0" + now.getHours()).slice(-2) + "-";
			ts += ("0" + now.getMinutes()).slice(-2);

			if(!_.isNull(backupJSON)) {
				var data = {"data": Base64.encode(JSON.stringify(backupJSON))};

				var formElements = [
					{
						name: 'api_token',
						value: self.config.api_token.toString()
					},
					{
						name: 'remote_id',
						value: self.config.remoteid.toString()
					},{
						name: 'email_report',
						value: self.config.email_log.toString()
					},{
						name: 'file',
						filename: "z-way-backup-" + ts + ".zab",
						type: 'application/octet-stream',
						value: JSON.stringify(data)
					}];

				res = formRequest.send(formElements, "POST", self.backupcreate_url);

				if(res.status === -1) { //error e.g. no connection to server
					self.addNotification("error", res.statusText, "module");
				} else {
					if(res.status === 200) {
						ret = true;
						self.addNotification("info", res.data.message, "module");
					} else {
						self.addNotification("error", res.data.message, "module");
					}
				}

			} else {
				console.log("Backup file empty!");
				self.addNotification("error", "", "module");
			}

		} catch(e) {
			console.log(e);
		}
		console.log("###### finisch Backup ");
		return ret;
	};

	self.onEmailChange = function(profile) {
		console.log("profile", JSON.stringify(profile));
		if(profile.id == 1) {
			// only change if email and remote id not empty
			if(profile.email !== "" && !_.isNull(self.config.remoteid)) {
				self.config.email = profile.email;
				// email change and remote id isn't know in database --> new user
				if(!self.config.user_active) {
					self.config.email = profile.email;
					// create new user
					self.userCreate();
				//  email change but remote id is know
				} else if(self.config.user_active) {
					self.config.email = profile.email;
					// update user (email)
					self.userUpdate();
				}
			}
		}
	}

	if(self.config.email !== "" && !_.isNull(self.config.remoteid) && !self.config.user_active) {
		this.userCreate();
	}

	if(self.config.scheduler !== "0" && self.config.user_active == true) { // manual
		this.updateTask();
	} else {
		this.controller.emit("cron.removeTask", "CloudBackup.upload");
	}

	// set up cron handler
	self.controller.on("CloudBackup.upload", self.uploadBackup);

	// set up email change hadler
	self.controller.on("profile.change", self.onEmailChange);

	self.saveConfig();
};

CloudBackup.prototype.stop = function() {

	this.controller.off("CloudBackup.upload", this.uploadBackup);
	this.controller.off("profile.change", this.onEmailChange);
	this.controller.emit("cron.removeTask", "CloudBackup.upload");

	delete global["CloudBackupAPI"];

	CloudBackup.super_.prototype.stop.call(this);
};


// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

CloudBackup.prototype.updateTask = function() {
	var self = this;

	switch(self.config.scheduler) {
		case "0": // manual
			self.config.minutes = null;
			self.config.hours = null;
			self.config.weekDays = null;
			self.config.days = null;
			break;
		case "1": // daily
			self.config.weekDays = null;
			self.config.days = null;
			break;
		case "2": // weekly
			self.config.days = null;
			break;
		case "3": // monthly
			self.config.weekDays = null;
			break;
	};

	console.log("### Backuptime ###");
	console.log("h", _.isNull(self.config.hours) ? "null" : parseInt(self.config.hours));
	console.log("m", _.isNull(self.config.minutes) ? "null" : parseInt(self.config.minutes));
	console.log("wd", _.isNull(self.config.weekDays) ? "null" : parseInt(self.config.weekDays));
	console.log("d", _.isNull(self.config.days) ? "null" : parseInt(self.config.days));
	console.log("##################");

	self.controller.emit("cron.addTask", "CloudBackup.upload", {
		minute: _.isNull(self.config.minutes) ? null : parseInt(self.config.minutes),
		hour: _.isNull(self.config.hours) ? null : parseInt(self.config.hours),
		weekDay: _.isNull(self.config.weekDays) ? null : parseInt(self.config.weekDays),
		day: _.isNull(self.config.days) ? null : parseInt(self.config.days),
		month: null
	});
};

CloudBackup.prototype.userCreate = function() {
	var self = this;

	var obj = {
		url: this.usercreate_url,
		method: "POST",
		async: true,
		headers: {
			"Content-Type": "application/json"
		},
		data: {
			remote_id: self.config.remoteid,
			email: self.config.email
		},
		success: function(response) {
			console.log("usercreate res", JSON.stringify(response));
			if(response.status === 200) { // user successfull added
				self.config.api_token = response.data.api_token;
				self.config.user_active = true;
				self.saveConfig();
			}
		},
		error: function(error){
			if(response.status === 409) {
				self.config.user_active = true;
			}
			console.log("usercreate error", JSON.stringify(error));
		}
	};

	console.log("usercreate obj", JSON.stringify(obj));

	http.request(obj);
};

CloudBackup.prototype.userUpdate = function() {
	var self = this;

	var obj = {
		url: this.userupdate_url,
		method: "POST",
		async: true,
		headers: {
			"Content-Type": "application/json"
		},
		data: {
			api_token: self.config.api_token,
			remote_id: self.config.remoteid,
			email: self.config.email
		},
		success: function(response) {
			console.log("userUpdate res", JSON.stringify(response));
			self.config.api_token = response.data.api_token;
			self.saveConfig();
		},
		error: function(error) {
			console.log("userUpdate error", JSON.stringify(error));
		}
	};

	console.log("userUpdate obj", JSON.stringify(obj));

	http.request(obj);
};

// --------------- Public HTTP API -------------------


CloudBackup.prototype.externalAPIAllow = function (name) {
	var _name = !!name ? ("CloudBackup." + name) : "CloudBackupAPI";

	ws.allowExternalAccess(_name, this.controller.auth.ROLE.ADMIN);
	ws.allowExternalAccess(_name + ".Backup", this.controller.auth.ROLE.ADMIN);
};

CloudBackup.prototype.externalAPIRevoke = function (name) {
	var _name = !!name ? ("CloudBackup." + name) : "CloudBackupAPI";

	ws.revokeExternalAccess(_name);
	ws.revokeExternalAccess(_name + ".Backup");
};

CloudBackup.prototype.defineHandlers = function () {
	var self = this;

	this.CloudBackupAPI = function () {
		return {status: 400, body: "Bad CloudBackupAPI request "};
	};

	this.CloudBackupAPI.Backup = function () {
		var ret = {status: 500,
			body: {"error": true}
		};

		var state = self.uploadBackup();

		if(state) {
			ret.status = 200;
			ret.body = {"error": false};
		}
		console.log(JSON.stringify(ret));
		return ret;
	};
}