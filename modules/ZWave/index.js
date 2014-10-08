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
    
    this.zway = new ZWaveBinding(this.config.name, this.config.port, {
        configFolder: this.config.config || 'config',
        translationsFolder: this.config.translations || 'translations',
        zddxFolder: this.config.ZDDX || 'ZDDX',
        terminationCallback: function() {
            self.terminating.call(self);
        }
    });
    
    this.zway.discover();
    
    zway = this.zway;
};

ZWave.prototype.stop = function () {
    console.log("--- ZWave.stop()");
    ZWave.super_.prototype.stop.call(this);

    this.terminating();
};

ZWave.prototype.terminating = function () {
    console.log("Terminating Z-Wave binding");

    this.zway.stop();
    this.zway = null;
    zway = null;
};

// Init Z-Wave API url handlers

allowExternalAccess("ZWaveAPI");
allowExternalAccess("ZWaveAPI.Run");
allowExternalAccess("ZWaveAPI.Data");
allowExternalAccess("ZWaveAPI.InspectQueue");
allowExternalAccess("ZWaveAPI.Backup");
allowExternalAccess("ZWaveAPI.Restore");

ZWaveAPI = function() {
    return { status: 400, body: "Bad ZWaveAPI request" };
};

ZWaveAPI.Run = function(url) {
    url = "zway." + url.substring(1);
    try {
    	var r = executeJS(url);
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

ZWaveAPI.Data = function(url) {
	var timestamp = parseInt(url.substring(1)) || 0;
	return {
		status: 200,
		headers: { 
			"Content-Type": "application/json",
			"Connection": "keep-alive"
		},
		body: zway.data(timestamp)    	
	};
}

ZWaveAPI.InspectQueue = function(url) {
	return {
		status: 200,
		headers: { 
			"Content-Type": "application/json",
			"Connection": "keep-alive"
		},
		body: zway.InspectQueue()    	
	};
}

ZWaveAPI.Backup = function(url) {
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
}

ZWaveAPI.Restore = function(url, request) {
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
}
