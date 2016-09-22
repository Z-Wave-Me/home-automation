

function CloudBackup (id, controller) {
    // Call superconstructor first (AutomationModule)
    CloudBackup.super_.call(this, id, controller);
}

inherits(CloudBackup, AutomationModule);

_module = CloudBackup;

CloudBackup.prototype.init = function(config) {
    CloudBackup.super_.prototype.init.call(this, config);

    var self = this,
        url = "http://192.168.10.252/dev/cloudbackup/?uri=backupcreate",
        langFile = self.controller.loadModuleLang(self.module);

    console.log(JSON.stringify(self));

    // load remote_id
    try {
        this.remoteid = self.controller.getRemoteId();
        self.config.remoteid = this.remoteid;
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

            res = formRequest.send(formElements, "POST", url);

            // prepare response
            if (!res.data.status || res.data.status !== 200) {
                //self.controller.addNotification("error", res.data.message, "core", self.module);
            } else {
                //self.controller.addNotification("info", res.data.message, "core", self.module);
            }
        } else {
            //self.controller.addNotification("error","text" , "core", "CloudBackup");
        }

        console.log("###### finisch Backup ");
    };


    if(self.config.email !== "" && !_.isNull(self.config.remoteid) && !self.config.user_active) {
        this.userCreate();
    }

    if(!self.config.manual) {
        self.controller.on("CloudBackup.upload", this.uploadBackup);
        this.updateTask();
    } else {
        this.removeTask();
    }
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

    this.removeTask();

    console.log("### Backuptime ###");
    console.log("m", self.config.minutes);
    console.log("h", self.config.hours);
    console.log("wd", self.config.weekDay);
    console.log("d", self.config.day);
    console.log("##################");

    self.controller.emit("cron.addTask", "CloudBackup.upload", {
        minute: parseInt(self.minutes),
        hour: parseInt(self.hours),
        weekDay: parseInt(self.weekDay),
        day: parseInt(self.day),
        month: null
    });

    self.controller.addNotification
};

CloudBackup.prototype.removeTask = function() {
    this.controller.emit("cron.removeTask", "CloudBackup.upload");
    this.controller.off("CloudBackup.upload", this.uploadBackup);
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

    var obj = {
        url: "http://192.168.10.252/dev/cloudbackup/?uri=usercreate",
        method: "POST",
        data: {
            remote_id: self.config.remoteid,
            email: self.config.email
        }
    };

    res = http.request(obj);

    if(res.data.status === 200) {
        self.config.user_active = true
        //self.controller.addNotification("info", res.data.message, "core", self.module);
    } else {
        //self.controller.addNotification("error", res.data.message, "core", self.module);
    }
};
