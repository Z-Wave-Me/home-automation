/*** RemoteAccess Z-Way HA module *******************************************

Version: 1.0.6
(c) Z-Wave.Me, 2015
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
        langFile = self.controller.loadModuleLang("RemoteAccess");

    this.path = self.config.path;
    this.zbw = null;
    this.checkIfTypeError = true;
    this.zbwTimerCount = 0;
    this.serviceTimerCount = 0;

    this.setZBWService = function() {
        // look if ZBW Service is available 
        if (typeof ZBWConnect === 'function') {
            try {
                self.zbw = self.path? new ZBWConnect(self.path) : new ZBWConnect(); // find zbw by path or use (raspberry) location /etc/zbw as default

                if(!!self.zbw) {
                    self.checkIfTypeError = self.zbw.getUserId() instanceof TypeError? true : false;
                    self.checkIfTypeError = self.zbw.getActStatus() instanceof TypeError? true : false;
                    self.checkIfTypeError = self.zbw.getSshStatus() instanceof TypeError? true : false;
                    self.checkIfTypeError = self.zbw.getStatus() instanceof TypeError? true : false;
                }
            } catch (e) {              

                if (self.serviceTimer) {
                    console.log('Clear self.serviceTimer ... ');
                    clearInterval(self.serviceTimer);
                }

                if (!self.zbwTimer) {
                    // set interval (5 sec) to check for service again - max. 5 min
                    self.zbwTimer = setInterval(function() {
                        self.zbwTimerCount ++;
                        console.log('zbwTimerCount:'+ self.zbwTimerCount);
                        self.setZBWService();
                    }, 5000);

                } else if (self.zbwTimer && self.zbwTimerCount > 60) {
                    console.log('Clear self.zbwTimer after 5 min');
                    // clear interval after 5 min
                    clearInterval(self.zbwTimer);
                    self.zbwTimer = undefined;
                    
                    self.controller.addNotification("warning", langFile.zbw_service_timeout, "module", "RemoteAccess");
                    self.controller.addNotification("error", langFile.load_zbw_error, "module", "RemoteAccess");
                    
                    console.log(langFile.load_zbw_error,'Error:', e.message);
                }
            }
            
            if (!!self.zbw && !self.checkIfTypeError) {
                // start RemoteAccess functions
                console.log('success! start zbw ... ');
                self.startRemoteAccess(config, self.zbw, langFile);

                // clear interval
                if (self.zbwTimer) {
                    console.log('Clear self.zbwTimer ... ');
                    clearInterval(self.zbwTimer);
                    self.zbwTimer = undefined;
                }

                if (self.serviceTimer) {
                    console.log('Clear self.serviceTimer ... ');
                    clearInterval(self.serviceTimer);
                    self.serviceTimer = undefined;
                }
            }

        } else if (!self.serviceTimer) {
            // set interval (5 sec) to check for service again - max. 5 min
            self.serviceTimer = setInterval(function() {
                self.serviceTimerCount ++;
                
                console.log('serviceTimerCount:', self.serviceTimerCount);
                self.setZBWService();
            }, 5000);

        } else if (self.serviceTimer && self.serviceTimerCount > 60) {
            // clear interval after 5 min
            console.log('Clear self.serviceTimer after 5 min');
            
            clearInterval(self.serviceTimer);
            self.serviceTimer = undefined;

            self.controller.addNotification("warning", langFile.zbw_service_timeout, "module", "RemoteAccess");
        }
    };

    // initialize service
    self.setZBWService();
};

RemoteAccess.prototype.stop = function () {

    if (this.serviceTimer) {
        clearInterval(this.serviceTimer);
        this.serviceTimer = undefined;
    }

    if (this.zbwTimer) {
        clearInterval(this.zbwTimer);
        this.zbwTimer = undefined;
    }

    RemoteAccess.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

RemoteAccess.prototype.startRemoteAccess = function (config, zbw, langFile) {
    
    var self = this;

    this.updateRemoteData = function () {
        try {
            self.config.userId = zbw.getUserId();
            self.config.actStatus = zbw.getActStatus();
            self.config.sshStatus = zbw.getSshStatus();
            self.config.zbwStatus = zbw.getStatus();
        } catch(e) {
            self.controller.addNotification("warning", langFile.setup_config_zbw_error + e.message, "module", "RemoteAccess");
        }
    };

    this.setRemoteConfigurations = function () {
        try{
            var raSshStatus = zbw.getSshStatus(),
                raStatus = zbw.getStatus(),
                password = self.config.pass? self.config.pass : '',
                currDate = new Date();

            // update userId (after restoring backup userId in the config might not be equal userId in ZBW service)
            self.config.userId = zbw.getUserId();

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
        self.updateRemoteData();
    } else {
        self.setRemoteConfigurations();
    }
};