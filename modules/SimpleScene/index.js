/*** SimpleScene Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me>
Description:

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function SimpleScene (id, controller) {
    // Call superconstructor first (AutomationModule)
    SimpleScene.super_.call(this, id, controller);
}

inherits(SimpleScene, AutomationModule);

_module = SimpleScene;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

SimpleScene.prototype.init = function (config) {
    SimpleScene.super_.prototype.init.call(this, config);

    var self = this;

    executeFile(this.moduleBasePath()+"/SimpleSceneDevice.js");
    this.vdev = new SimpleSceneDevice("SimpleScene", this.controller);
    this.vdev.config = this.config;
    this.vdev.init();
    this.controller.registerDevice(this.vdev);
    
    this.sceneId = "Scene_" + this.id.toString()
    this.pushSceneToNamespaceVar(this.sceneId, this.config.title);
};

SimpleScene.prototype.stop = function () {
    this.vdev.config = null; // remove cyclic reference
    this.popSceneFromNamespaceVar(this.sceneId);
    this.controller.removeDevice(this.vdev.id);

    SimpleScene.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

SimpleScene.prototype.pushSceneToNamespaceVar = function (sceneId, sceneName) {
    var namespaces = [{"sceneId": sceneId, "sceneName": sceneName}];

    if (!_.any(controller.namespaces, function (namespace) { return namespace.id === varName})) {
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

SimpleScene.prototype.pushSceneToNamespaceVar = function (sceneId, sceneName) {
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
