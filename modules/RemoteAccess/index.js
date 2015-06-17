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
        zbw = new ZBWConnect(),
        intToBool = function (i){
            if(parseInt(i) === 1){
                return true;
            } else {
                return false;
            }
        },
        boolToInt = function (b){
            if(b === true){
                return 1;
            } else {
                return 0;
            }
        };

    this.updateRemoteData = function () {
        self.config.userId = zbw.getUserId();
        self.config.actStatus = intToBool(zbw.getActStatus());
        self.config.sshStatus = intToBool(zbw.getSshStatus());
        self.config.zbwStatus = intToBool(zbw.getStatus());
    };

    this.setRemoteConfigurations = function () {
        var raInstance = self.controller.instances.filter(function (instance){
                return instance.moduleId === 'RemoteAccess';
            }),
            raSshStatus = raInstance[0]? raInstance[0].params.sshStatus : '',
            raStatus = raInstance[0]? raInstance[0].params.zbwStatus : '',
            raPass = raInstance[0]? raInstance[0].params.pass: '',
            currDate = new Date();

        this.updateRemoteData();

        // compare changed values with values from server
        try{
            if(raStatus !== false && raStatus === self.config.zbwStatus && (raSshStatus !== '' && raSshStatus !== self.config.sshStatus || raPass && raPass !== '')){
                zbw.setStatus(0); // stop zbw
                console.log('--- Stopping ZBW Connect Service');
                setTimeout(function() {
                    zbw.setStatus(1);
                    console.log('--- Starting ZBW Connect Service');
                }, 7000); // wait 7 sec to start zbw
            }
            if(raSshStatus !== '' && raSshStatus !== self.config.sshStatus){
                zbw.setSshStatus(boolToInt(raSshStatus));
                self.config.sshStatus = raSshStatus;
                self.config.lastChange.sshStatus = currDate;
            }
            if(raStatus !== '' && raStatus !== self.config.zbwStatus){
                zbw.setStatus(boolToInt(raStatus));
                raStatus === false? console.log('--- Stopping ZBW Connect Service') : console.log('--- Starting ZBW Connect Service');
                self.config.zbwStatus = raStatus;
                self.config.lastChange.zbwStatus = currDate;
                self.config.actStatus = intToBool(zbw.getActStatus());
            }
            if(raPass && raPass !== ''){
                zbw.setPass(raPass);
                self.config.pass = '';
                self.config.lastChange.pass = currDate;
            }
            if((raSshStatus !== '' && raSshStatus !== self.config.sshStatus) || (raStatus !== '' && raStatus !== self.config.zbwStatus) || (raPass && raPass !== '')) {
                self.controller.addNotification("notification", langFile.config_changed_successful, "module", "RemoteAccess");
            }
        } catch(e) {
            self.controller.addNotification("error", langFile.config_changed_error + e.message, "module", "RemoteAccess");
        } 
    };
    
    // run first time to set up the value
    if(self.config.userId === '' && self.config.actStatus === '' && self.config.sshStatus === '' && self.config.zbwStatus === '') {
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
