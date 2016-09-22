

function CloudBackup (id, controller) {
    // Call superconstructor first (AutomationModule)
    CloudBackup.super_.call(this, id, controller);
}

inherits(CloudBackup, AutomationModule);

_module = CloudBackup;

CloudBackup.prototype.init = function(config) {
    CloudBackup.super_.prototype.init.call(this, config);

    var self = this,
        url = "http://192.168.10.252/dev/cloudbackup/?uri=backupcreate";

    // load backup config
    /*
    this.backupconfig = loadObject("backupconfig.json");

    if(this.backupconfig === null) {
        this.backupconfig = {
            'user_active': false,
            'email_log': 0,
            'time': {
                'minute': null,
                'hour': null,
                'weekDay': null,
                'day': null,
                'month': null
            }
        };

    }
    */

    console.log(JSON.stringify(self.config));

    // load current user

    // load remote_id
    try {
        this.remoteid = self.controller.getRemoteId();
    } catch(e) {
        console.log(e.message);
        return;
    }

    this.uploadBackup = function() {
        console.log("###### start Backup ");
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
                    name: 'remote_id',
                    value: self.remoteid.toString()
                },{
                    name: 'email_report',
                    value: self.backupconfig.email_log.toString()
                },{
                    name: 'file',
                    filename: "z-way-backup-" + ts + ".zab",
                    type: 'application/octet-stream',
                    value: JSON.stringify(data)
                }];

            res = formRequest.send(formElements, "POST", url);

            // prepare response
            if (!res.data.status || res.data.status !== 200) {
                self.controller.addNotification("error", res.data.message, "core", "CloudBackup");
            } else {
                self.controller.addNotification("info", res.data.message, "core", "CloudBackup");
            }
        } else {
            self.controller.addNotification("error","text" , "core", "CloudBackup");
        }

        console.log("###### finisch Backup ");
    };

    this.updateTask();

    // set up cron handler
    self.controller.on("CloudBackup.upload", this.uploadBackup);

    this.userCreate();
};

CloudBackup.prototype.stop = function() {

    // save backup config
    //saveObject("backupconfig.json", this.backupconfig);

    this.controller.emit("cron.removeTask", "CloudBackup.upload");
    this.controller.off("CloudBackup.upload", this.uploadBackup);

    CloudBackup.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

CloudBackup.prototype.updateTask = function() {
    var self = this;

    self.controller.emit("cron.removeTask", "CloudBackup.upload");
    console.log("m", self.config.minutes);
    console.log("h", self.config.hours);
    console.log("wd", self.config.weekDay);
    console.log("d", self.config.day);
    self.controller.emit("cron.addTask", "CloudBackup.upload", {
        minute: self.minutes,
        hour: self.hours,
        weekDay: self.weekDay,
        day: self.day,
        month: null
    });

};

CloudBackup.prototype.activateCloudBackup = function(active) {
    var self = this;

    if(active) {
        self.backupconfig.active = active;
        self.controller.on("CloudBackup.upload", this.uploadBackup);
    } else {
        self.backupconfig.active = active;
        this.stop();
    }
};

CloudBackup.prototype.userCreate = function() {
    var self = this;

    /*var obj = {
        url: "http://192.168.10.252/dev/cloudbackup/?uri=usercreate",
        method: "POST",
        data: {
            remote_id: self.remoteid,
            email: email
        }
    };

    res = http.request(obj);

    if(res.data.status === 200) {
        self.controller.addNotification("info", res.data.message, "core", "CloudBackup");
    } else {
        self.controller.addNotification("error", res.data.message, "core", "CloudBackup");
    }*/

};

//CloudBackup.prototype.

/*
CloudBackup: function() {



    // GET
    if(this.req.method === "GET") {
        var remoteid = this.getRemoteId();
        if(remoteid.data != null) {

            reply.code = 200;
            reply.data = {
                'active': backupconfig.active,
                'remote_id': remoteid.data.remote_id,
                'email': profile.email,
                'email_log': backupconfig.email_log,
                'time': backupconfig.time
            };

        } else {
            reply.error = remoteid.error;
        }
    }

    if(this.req.method === "PUT" && this.req.body) {
        reqObj = typeof this.req.body === "string" ? JSON.parse(this.req.body) : this.req.body;


         //remove cron
         this.controller.emit("cron.addTask", "CloudBackup.upload");
         this.controller.off("CloudBackup.upload", this.uploadBackup);



        if(reqObj.hasOwnProperty('email_log') && reqObj.hasOwnProperty('email')) {
            backupconfig.email_log = reqObj.email_log;
            backupconfig.time = JSON.parse(reqObj.time);

            if(profile.email !== "" && profile.email !== reqObj.email) {
                profile.email = reqObj.email;
                profile = this.controller.updateProfile(profile, profile.id);
            }

            reply.code = 200;
        } else {

        }
    }

    saveObject("backupconfig.json", backupconfig);
    return reply;
}

*/