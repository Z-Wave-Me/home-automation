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
        raInstance = self.controller.instances.filter(function (instance){
            return instance.moduleId === 'RemoteAccess' && (instance.active === 'true' || instance.active === true);
        }),
        getZbwActStatus = GetZbwActStatus() || '',
        getZbwSshStatus = GetZbwSshStatus() || '',
        getZbwStatus = GetZbwStatus() || '',
        raZbwActStatus = raInstance? raInstance[0].params.zbwActStatus : '',
        raZbwSshStatus = raInstance? raInstance[0].params.zbwSshStatus : '',
        raZbwStatus = raInstance? raInstance[0].params.zbwStatus : '',
        raZbwPass = raInstance? raInstance[0].params.zbwPass : '',
        pw;

        self.config.zbwActStatus = raZbwActStatus === '' && intToBool(getZbwActStatus) !== raZbwActStatus? intToBool(getZbwActStatus) : raZbwActStatus;
        self.config.zbwSshStatus = raZbwSshStatus === '' && intToBool(getZbwSshStatus) !== raZbwSshStatus? intToBool(getZbwSshStatus) : raZbwSshStatus;
        self.config.zbwStatus = raZbwStatus === '' && intToBool(getZbwStatus) !== raZbwStatus? intToBool(getZbwStatus) : raZbwStatus;

        try{
            if(raZbwSshStatus !== '' && raZbwSshStatus !== intToBool(getZbwSshStatus)){
                SetZbwSshStatus(boolToInt(raZbwSshStatus));
            }
            if(raZbwStatus !== '' && raZbwStatus !== intToBool(getZbwStatus)){
                SetZbwStatus(boolToInt(raZbwStatus));
            }
            if(raZbwPass !== '' && raZbwPass !== pw){
                SetZbwPass(raZbwPass);
            }

            pw = raZbwPass;

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
