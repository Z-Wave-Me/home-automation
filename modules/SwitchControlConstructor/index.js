/*** SwitchControlConstructor Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me>
Description:

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function SwitchControlConstructor (id, controller) {
    // Call superconstructor first (AutomationModule)
    SwitchControlConstructor.super_.call(this, id, controller);
}

inherits(SwitchControlConstructor, AutomationModule);

_module = SwitchControlConstructor;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

SwitchControlConstructor.prototype.init = function (config) {
    SwitchControlConstructor.super_.prototype.init.call(this, config);

    executeFile(this.moduleBasePath() + "/SwitchControlDevice.js");
    
    this.vDevs = [];

    var self = this;

    this.registerSwitch = function (id, title, activationHandler) {
        var switchId = id.toString();
        
        var vDev = new SwitchControlDevice(switchId, self.controller);
        vDev.activationHandler = activationHandler;
        vDev.init();

        self.vDevs.push(vDev);
        self.controller.registerDevice(vDev);
        self.pushSwitchToNamespaceVar(switchId, title);
    };

    this.unregisterSwitch = function (id) {
        var switchId = id.toString();
        var index = -1;
        for (var i = 0; i < self.vDevs.length; i++) {
            if (self.vDevs[i].id === switchId) {
                index = i;
                break;
            }
        }
        
        if (index === -1) {
            return; // not found
        }
        
        var vDev = self.vDevs.splice(index, 1)[0];
        
        vDev.activationHandler = null;
        self.popSwitchFromNamespaceVar(switchId);
        self.controller.removeDevice(switchId);
    };

    this.controller.on("switches.register", this.registerSwitch);
    this.controller.on("switches.unregister", this.unregisterSwitch);
};


SwitchControlConstructor.prototype.stop = function () {
    this.controller.off("switches.register", this.registerSwitch);
    this.controller.off("switches.unregister", this.unregisterSwitch);
    
    var self = this;
    this.vDevs.forEach(function(vDev) {
        self.controller.removeDevice(vDev.id);
    });
    
    this.vDevs = [];

    SwitchControlConstructor.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------


SwitchControlConstructor.prototype.pushSwitchToNamespaceVar = function (switchId, switchName) {
    var namespaces = [{"switchId": switchId, "switchName": switchName}],
        switchesNameSpace,
        index;

    if (!_.any(controller.namespaces, function (namespace) { return namespace.id === "switches"; })) {
        controller.namespaces.push({
            id: "switches",
            params: namespaces
        });
    } else {
        switchesNameSpace = _.find(controller.namespaces, function (namespace) { return namespace.id === "switches"; });
        index = controller.namespaces.indexOf(switchesNameSpace);

        controller.namespaces[index].params = _.union(controller.namespaces[index].params, namespaces);
    }

    namespaces = [];
};

SwitchControlConstructor.prototype.popSwitchFromNamespaceVar = function (switchId, switchName) {
    if (!_.any(controller.namespaces, function (namespace) { return namespace.id === "switches"; })) {
        return; // nothing to do
    } else {
        var switchesNameSpace = _.find(controller.namespaces, function (namespace) { return namespace.id === "switches"; }),
            index = controller.namespaces.indexOf(switchesNameSpace),
            element = _.find(controller.namespaces[index].params, function (id) { return id === switchId }),
            elementIndex = controller.namespaces[index].params.indexOf(element);
        
        controller.namespaces[index].params.splice(index, 1);
    }
};
