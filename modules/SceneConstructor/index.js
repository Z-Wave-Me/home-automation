/*** SceneConstructor Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me>
Description:

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function SceneConstructor (id, controller) {
    // Call superconstructor first (AutomationModule)
    SceneConstructor.super_.call(this, id, controller);
}

inherits(SceneConstructor, AutomationModule);

_module = SceneConstructor;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

SceneConstructor.prototype.init = function (config) {
    SceneConstructor.super_.prototype.init.call(this, config);

    executeFile(this.moduleBasePath()+"/SceneConstructorDevice.js");
    
    this.vDevs = [];

    var self = this;

    this.registerScene = function (id, title, activationHandler) {
        var sceneId = "Scene_" + id.toString();
        
        var vDev = new SceneConstructorDevice(sceneId, self.controller);
        vDev.activationHandler = activationHandler;
        vDev.init();

        self.vDevs.push(vDev);
        self.controller.registerDevice(vDev);
        self.pushSceneToNamespaceVar(sceneId, title);
    };

    this.unregisterScene = function (id) {
        var sceneId = "Scene_" + id.toString();
        
        var index = -1;
        
        for (var i = 0; i < self.vDevs.length; i++) {
            if (self.vDevs[i].id === sceneId) {
                index = i;
                break;
            }
        }
        
        if (index === -1) {
            return; // not found
        }
        
        var vDev = self.vDevs.splice(i, 1);
        
        vDev.activationHandler = null;
        self.popSceneFromNamespaceVar(sceneId);
        self.controller.removeDevice(vDev.id);
    };

    this.controller.on("scenes.register", this.registerScene);
    this.controller.on("scenes.unregister", this.unregisterScene);
};


SceneConstructor.prototype.stop = function () {
    this.controller.off("scenes.register", this.registerScene);
    this.controller.off("scenes.unregister", this.unregisterScene);
    
    var self = this;
    this.vDevs.forEach(function(vDev) {
        self.controller.removeDevice(vDev.id);
    });
    
    this.vDevs = [];

    SceneConstructor.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------


SceneConstructor.prototype.pushSceneToNamespaceVar = function (sceneId, sceneName) {
    var namespaces = [{"sceneId": sceneId, "sceneName": sceneName}];

    if (!_.any(controller.namespaces, function (namespace) { return namespace.id === "scenes"})) {
        controller.namespaces.push({
            id: "scenes",
            params: namespaces
        });
    } else {
        var scenesNameSpace = _.find(controller.namespaces, function (namespace) { return namespace.id === "scenes"}),
            index = controller.namespaces.indexOf(scenesNameSpace);

        controller.namespaces[index].params = _.union(controller.namespaces[index].params, namespaces);
    }

    namespaces = [];
};

SceneConstructor.prototype.popSceneFromNamespaceVar = function (sceneId, sceneName) {
    if (!_.any(controller.namespaces, function (namespace) { return namespace.id === "scenes"})) {
        return; // nothing to do
    } else {
        var scenesNameSpace = _.find(controller.namespaces, function (namespace) { return namespace.id === "scenes"}),
            index = controller.namespaces.indexOf(scenesNameSpace);

        var element = _.find(controller.namespaces[index].params, function (id) { return id === sceneId }),
            elementIndex = controller.namespaces[index].params.indexOf(element);
        
        controller.namespaces[index].params.splice(index, 1);
    }
};
