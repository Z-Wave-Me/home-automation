/* System Start */
'use strict';
; (function () {
    var App = function () {
        var self = this,
            fs = global.fs,
            bootFolderPath = 'system/boot';

        // Loading Core
        if (global.executeFile) {
            executeFile('core/core.js');
        }
        self.Core = global.Core;

        // Loading Config
        console.log('System: Loading Config');
        try {
            self.config = fs.loadJSON('system/server-config.json');
        } catch (e) {
            console.log('Config file is not found');
            return; // skip this modules
        }

        // Loading package.json and set current version API
        try {
            self.config.version = fs.loadJSON('package.json').version;
        } catch (e) {
            console.log('package.json didn\'t load');
            return; // skip this modules
        }

        // Loading boot scripts
        console.log('System: Loading Boot Scripts');
        try {
            fs.list(bootFolderPath).sort().forEach(function (fileName) {
                executeFile(bootFolderPath + '/' + fileName);
            });
        } catch (e) {
            console.log('System: Boot folder is empty');
            return; // skip loading boot folder
        }

        return this;
    };

    App.prototype = {
        init: function () {
            var self = this;

            self.models = {};

            try {
                self.modelsConfig = fs.loadJSON('system/model-config.json');
            } catch (e) {
                console.log('System: Model config didn\'t load');
                return; // skip loading boot folder
            }

            console.log('System: Registering Models');
            self.modelsConfig._meta.sources.forEach(function (path) {
                fs.list(path).sort().forEach(function (modelFileName) {
                    if (modelFileName.indexOf('.json') !== -1) {
                        var modelConfig = fs.loadJSON(path + modelFileName),
                            pluralName = modelConfig.pluralName || modelConfig.name + 's',
                            name = modelConfig.name;

                        if (name) {
                            executeFile(path + name.toLowerCase() + '.js');
                            executeFile('system/collections/' + pluralName.toLowerCase() + '.js');
                            var CollectionConstructor = Core.Namespace('Collections.' + pluralName).Extend({
                                settings: modelConfig,
                                policy: self.modelsConfig[name],
                                model: Core.Namespace('Models.' + pluralName)
                            });

                            self.models[name] = new CollectionConstructor();
                        }
                    }
                });
            });

            console.log('System: Registering Handlers');
            ['cors', 'rest'].forEach(function (handlerName) {
                executeFile('system/handlers/' + handlerName + '.js');
            });
        }
    };

    global.App = new App();
    global.App.init();
}());