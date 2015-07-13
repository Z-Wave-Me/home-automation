/*** RemoteAccess Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: Niels Roche <nir@zwave.eu>
Description:
    This module allows to set or get remote access values in admin profile via 'My settings'
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function RemoteAccess (id, controller) {
    // Call superconstructor first (AutomationModule)
    RemoteAccess.super_.call(this, id, controller);
}

inherits(RemoteAccess, AutomationModule);

_module = RemoteAccess;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

RemoteAccess.prototype.init = function (config) {
    RemoteAccess.super_.prototype.init.call(this, config);

    var self = this,
        langFile = self.controller.loadModuleLang("RemoteAccess"),
        path = self.config.path;

    try {
        var zbw = path? new ZBWConnect(path) : new ZBWConnect(); // find zbw by path or use (raspberry) location /etc/zbw as default
    } catch (e) {
        self.controller.addNotification("error", langFile.load_zbw_error + e.message, "module", "RemoteAccess");
    }

    this.updateRemoteData = function () {
        try {
            self.config.userId = zbw.getUserId();
            self.config.actStatus = zbw.getActStatus();
            self.config.sshStatus = zbw.getSshStatus();
            self.config.zbwStatus = zbw.getStatus();
        } catch(e) {
            self.controller.addNotification("error", langFile.setup_config_zbw_error + e.message, "module", "RemoteAccess");
        }
    };

    this.setRemoteConfigurations = function () {
        try{
            var raSshStatus = zbw.getSshStatus(),
                raStatus = zbw.getStatus(),
                password = self.config.pass? self.config.pass : '',
                currDate = new Date();

            // stop and start zbw connect if necessary       
            if(raStatus !== false && raStatus === self.config.zbwStatus && (raSshStatus !== self.config.sshStatus || password)){
                zbw.setStatus(false); // stop zbw
                console.log('--- Stopping ZBW Connect Service');
                setTimeout(function() {
                    zbw.setStatus(true);
                    console.log('--- Starting ZBW Connect Service');
                }, 7000); // wait 7 sec to start zbw
            }

            // set remote ssh status
            if(raSshStatus !== self.config.sshStatus){
                zbw.setSshStatus(self.config.sshStatus);
                self.config.lastChange.sshStatus = currDate;
            }

            // start/stop zbw connect - start/stop RemoteAccess
            if(raStatus !== self.config.zbwStatus){
                zbw.setStatus(self.config.zbwStatus);
                self.config.zbwStatus === false ? console.log('--- Stopping ZBW Connect Service') : console.log('--- Starting ZBW Connect Service');
                self.config.lastChange.zbwStatus = currDate;
                self.config.actStatus = zbw.getActStatus();
            }

            // set remote password
            if(password){
                zbw.setPass(password);
                self.config.pass = '';
                self.config.lastChange.pass = currDate;
            }

            if(raSshStatus !== self.config.sshStatus || raStatus !== self.config.zbwStatus || password) {
                self.controller.addNotification("notification", langFile.config_changed_successful, "module", "RemoteAccess");
            }

        } catch(e) {
            self.controller.addNotification("error", langFile.config_changed_error + e.message, "module", "RemoteAccess");
        } 
    };
    
    // run first time to get the values from zbw module
    if(self.config.userId === '' || self.config.actStatus === '' || self.config.sshStatus === '' || self.config.zbwStatus === '') {
        this.updateRemoteData();
    } else {
        this.setRemoteConfigurations();
    }    
};

RemoteAccess.prototype.stop = function () {
    RemoteAccess.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
