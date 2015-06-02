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
        langFile = self.controller.loadModuleLang("RemoteAccess");

    this.pw = self.config.zbwPass;

    this.getRemoteConfigurations = function () {
        var intToBool = function (i){
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
        },
        zbwActStatus = GetZbwActStatus(),
        zbwSshStatus = GetZbwSshStatus(),
        zbwStatus = GetZbwStatus();

        self.config.zbwActStatus = self.config.zbwActStatus === ''? intToBool(zbwActStatus) : self.config.zbwActStatus;
        self.config.zbwSshStatus = self.config.zbwSshStatus === ''? intToBool(zbwSshStatus) : self.config.zbwSshStatus;
        self.config.zbwStatus = self.config.zbwStatus === ''? intToBool(zbwStatus) : self.config.zbwStatus;

        try{
            if(self.config.zbwSshStatus !== intToBool(zbwSshStatus)){
                SetZbwSshStatus(boolToInt(self.config.zbwSshStatus));
            }
            if(self.config.zbwStatus !== intToBool(zbwStatus)){
                SetZbwStatus(boolToInt(self.config.zbwStatus));
            }
            if(self.config.zbwPass !== this.pw){
                SetZbwPass(self.config.zbwPass);
            }

            this.pw = self.config.zbwPass;

            self.controller.addNotification("notification", langFile.config_changed_successful, "module", "RemoteAccess");
        } catch(e) {
            self.controller.addNotification("error", langFile.config_changed_error + e.message, "module", "RemoteAccess");
        }       
    };
    
    // run first time to set up the value
    this.getRemoteConfigurations();
};

RemoteAccess.prototype.stop = function () {
    RemoteAccess.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
