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
        raActStatus = raInstance[0].params.actStatus,
        raSshStatus = raInstance[0].params.sshStatus,
        raStatus = raInstance[0].params.status,
        raPass = raInstance[0].params.pass,
        currDate = new Date();

        self.config.userId = getUserId();
        self.config.actStatus = intToBool(getActStatus());
        self.config.sshStatus = intToBool(getSshStatus());
        self.config.status = intToBool(getStatus());        

        // compare changed values with values from server
        try{
            if(raSshStatus !== '' && raSshStatus !== self.config.sshStatus){
                setSshStatus(boolToInt(raSshStatus));
                self.config.sshStatus = raSshStatus;
                self.config.lastChange.sshStatus = currDate;
            }
            if(raStatus !== '' && raStatus !== self.config.status){
                setStatus(boolToInt(raStatus));
                self.config.status = raStatus;
                self.config.lastChange.status = currDate;
                self.config.actStatus = intToBool(getActStatus());
            }
            if(raPass && raPass !== ''){
                setPass(raPass);
                self.config.pass = '';
                self.config.lastChange.pass = currDate;
            }

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
