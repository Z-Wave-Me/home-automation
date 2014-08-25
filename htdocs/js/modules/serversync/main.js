define([
    // components
    'backbone',
    'helpers/bb-sync'
], function (
    Backbone,
    bbSync
    ) {
    'use strict';

    return Backbone.View.extend({
        initialize: function (options, Ctx) {
            _.bindAll(this, 'start', 'refresh',
                'regCollection', 'getCollection', 'registerHandler',
                '_preFilterAjax', '_getQueryParams');

            var that = this,
                query = that._getQueryParams(window.location.search),
                collection_default_path = 'modules/serversync/collections/',
                arrayCollections = [
                    {
                        name: 'Profiles',
                        path: collection_default_path + 'profiles',
                        interval: false
                    },
                    {
                        name: 'Locations',
                        path: collection_default_path + 'locations',
                        interval: false
                    },
                    {
                        name: 'Devices',
                        path: collection_default_path + 'devices',
                        interval: true,
                        dependencies: 'Profiles'
                    },
                    {
                        name: 'Notifications',
                        path: collection_default_path + 'notifications',
                        interval: true
                    },
                    {
                        name: 'Namespaces',
                        path: collection_default_path + 'namespaces',
                        interval: false
                    },
                    {
                        name: 'Modules',
                        path: collection_default_path + 'modules',
                        interval: false,
                        dependencies: 'Namespaces'
                    },
                    {
                        name: 'Instances',
                        path: collection_default_path + 'instances',
                        interval: false,
                        dependencies: 'Namespaces'
                    }
                ];

            _.extend(that, {}, {
                apiPort: query.hasOwnProperty('port') ? query.port : window.location.port,
                apiHost: query.hasOwnProperty('host') ? query.host : window.location.hostname,
                arrayCollections: arrayCollections,
                options: _.extend({}, options || {}),
                registerCollection: {},
                collections: {},
                Ctx: Ctx
            });

            that._preFilterAjax();
            Backbone.sync = bbSync;

            that.arrayCollections.forEach(that.regCollection);
            window.state = that.Ctx;
        },
        regCollection: function (collectionObject) {
            var that = this,
                state = that.Ctx.state();

            require([collectionObject.path], function (collection) {
                that.collections[collectionObject.name] = {
                    collection: new collection(),
                    interval: collectionObject.interval,
                    dependencies: collectionObject.dependencies || null
                };

                console.log(collectionObject.name + ' collection initialized')

                if (collectionObject.name === 'Notifications') {
                    that.registerHandler(collectionObject.name , 'change add remove', function () {
                        state.update('notifications.' + collectionObject.name.toLowerCase(), function () {
                            return that.collections[collectionObject.name].collection.toJSON();
                        });
                        state.update('notificationsCount', function () {
                            return that.collections[collectionObject.name].collection.length;
                        });
                    });

                    that.registerHandler(collectionObject.name , 'error', function () {
                        state.update('notificationsSeverity', function () {
                            return 'error';
                        });
                        state.update('notificationsMessage', function () {
                            return 'No connection';
                        });
                    });

                    that.registerHandler(collectionObject.name , 'success', function () {
                        var counts = that.collections[collectionObject.name].groupCount(),
                            className,
                            message;

                        state.update('notificationsSeverity', function () {
                            counts = that.collections[collectionObject.name].groupCount();

                            if (counts.error > 0) {
                                className = 'error';
                            } else if (counts.error === 0 && counts.warning > 0) {
                                className = 'warning';
                            } else {
                                className = 'ok';
                            }
                            return className;
                        });

                        state.update('notificationsMessage', function () {
                            counts = that.collections[collectionObject.name].groupCount();

                            if (counts.error > 0) {
                                message = 'Error';
                            } else if (counts.error === 0 && counts.warning > 0) {
                                message = 'Warning';
                            } else {
                                message = 'OK';
                            }
                            return message;
                        });
                    });
                }

                if (collectionObject.name === 'Devices') {
                    that.registerHandler(collectionObject.name , 'add', function (model) {
                        state.update('devices', function (devices) {
                            return devices.push(that.Ctx.Imm.Map(model.toJSON()));
                        });
                        state.set('devicesCount', that.collections[collectionObject.name].collection.length);
                        state.set('devicesUpdateTime', that.collections[collectionObject.name].collection.updateTime || 0);
                    });
                }

                if (Object.keys(that.collections).length === that.arrayCollections.length) {
                    Object.keys(that.collections).forEach(function (key) {
                        if (Boolean(that.collections[key].dependencies)) {
                            that.registerHandler(that.collections[key].dependencies, 'success', that.collections[collectionObject.name].collection.fetch);
                        }
                    });
                    that.start();
                    /*setTimeout(function () {
                        var obj = {"data":{"structureChanged":true,"updateTime":1408878746,"devices":[{"id":"ZWayVDev_6:0:37","metrics":{"level":"on","icon":"switch","title":"Switch 6:0"},"tags":["On"],"location":null,"deviceType":"switchBinary","updateTime":1408462198},{"id":"ZWayVDev_7:0:128","metrics":{"probeTitle":"Battery","scaleTitle":"%","level":100,"icon":"battery","title":"Battery 7:0"},"tags":[],"location":null,"deviceType":"battery","updateTime":1408462198},{"id":"ZWayVDev_15:0:128","metrics":{"probeTitle":"Battery","scaleTitle":"%","level":100,"icon":"battery","title":"Battery 15:0"},"tags":[],"location":null,"deviceType":"battery","updateTime":1408462198},{"id":"ZWayVDev_19:0:128","metrics":{"probeTitle":"Battery","scaleTitle":"%","level":100,"icon":"battery","title":"Battery 19:0"},"tags":[],"location":null,"deviceType":"battery","updateTime":1408462198},{"id":"ZWayVDev_24:0:128","metrics":{"probeTitle":"Battery","scaleTitle":"%","level":100,"icon":"battery","title":"Battery 24:0"},"tags":[],"location":null,"deviceType":"battery","updateTime":1408878097},{"id":"DummyDevice_bn_7","metrics":{"probeTitle":"","scaleTitle":"","level":"on","icon":"alarm","title":"на Охране"},"tags":["On"],"location":6,"deviceType":"switchBinary","updateTime":1408462198},{"id":"OpenWeather_12","metrics":{"probeTitle":"Temperature","scaleTitle":"°C","title":"Moscow","level":22.3,"icon":"http://openweathermap.org/img/w/01d.png"},"tags":[],"location":null,"deviceType":"sensorMultilevel","updateTime":1408877012},{"id":"HTTP_Device_toggleButton_13","metrics":{"icon":"http://icons.iconarchive.com/icons/visualpharm/icons8-metro-style/32/House-and-Appliances-Tv-icon.png","title":"Телевизор"},"tags":[],"location":4,"deviceType":"toggleButton","updateTime":1408462199},{"id":"GroupDevices_bn_14","metrics":{"probeTitle":"","scaleTitle":"","level":"76","icon":"","title":"Свет общий"},"tags":["On"],"location":null,"deviceType":"switchMultilevel","updateTime":1408462199},{"id":"CameraDevice_15","metrics":{"url":"htpp://dsfdgfdsfg","hasZoomIn":true,"hasZoomOut":true,"hasLeft":true,"hasRight":false,"hasUp":false,"hasDown":false,"hasOpen":true,"hasClose":true,"icon":"camera","title":"Camera 15"},"tags":[],"location":null,"deviceType":"camera","updateTime":1408462199},{"id":"Notification_16","metrics":{"level":"on","icon":"","title":"Notification 16"},"tags":[],"location":null,"deviceType":"toggleButton","updateTime":1408462199},{"id":"Remote_18_18:0:0","metrics":{"icon":"","title":"Remote_18_18:0:0","level":"off","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_21:1:1","metrics":{"icon":"","title":"Remote_18_21:1:1","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_36:0:1","metrics":{"icon":"","title":"Remote_18_36:0:1","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_39:0:1","metrics":{"icon":"","title":"Remote_18_39:0:1","level":"off","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_74:0:2","metrics":{"icon":"","title":"Remote_18_74:0:2","level":"off","change":"upstop"},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_74:0:3","metrics":{"icon":"","title":"Remote_18_74:0:3","level":"off","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_74:0:5","metrics":{"icon":"","title":"Remote_18_74:0:5","level":"off","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_74:0:6","metrics":{"icon":"","title":"Remote_18_74:0:6","level":"off","change":"downstop"},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_74:0:7","metrics":{"icon":"","title":"Remote_18_74:0:7","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_74:0:9:82","metrics":{"icon":"","title":"Remote_18_74:0:9:82","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_74:0:9:81","metrics":{"icon":"","title":"Remote_18_74:0:9:81","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_76:0:2","metrics":{"icon":"","title":"Remote_18_76:0:2","level":"off","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_77:0:2","metrics":{"icon":"","title":"Remote_18_77:0:2","level":"off","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_78:0:2","metrics":{"icon":"","title":"Remote_18_78:0:2","level":"off","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_82:0:2","metrics":{"icon":"","title":"Remote_18_82:0:2","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_84:0:11:103","metrics":{"icon":"","title":"Remote_18_84:0:11:103","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_84:0:11:105","metrics":{"icon":"","title":"Remote_18_84:0:11:105","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_84:0:11:104","metrics":{"icon":"","title":"Remote_18_84:0:11:104","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_84:0:11:106","metrics":{"icon":"","title":"Remote_18_84:0:11:106","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_87:0:11:101","metrics":{"icon":"","title":"Remote_18_87:0:11:101","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_87:0:6","metrics":{"icon":"","title":"Remote_18_87:0:6","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_87:0:2","metrics":{"icon":"","title":"Remote_18_87:0:2","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_88:0:7","metrics":{"icon":"","title":"Remote_18_88:0:7","level":"off","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_88:0:2","metrics":{"icon":"","title":"Remote_18_88:0:2","level":"off","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_88:0:3","metrics":{"icon":"","title":"Remote_18_88:0:3","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_88:0:4","metrics":{"icon":"","title":"Remote_18_88:0:4","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_88:0:9:81","metrics":{"icon":"","title":"Remote_18_88:0:9:81","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_88:0:9:82","metrics":{"icon":"","title":"Remote_18_88:0:9:82","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_88:0:10:91","metrics":{"icon":"","title":"Remote_18_88:0:10:91","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_88:0:10:92","metrics":{"icon":"","title":"Remote_18_88:0:10:92","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_88:0:11:101","metrics":{"icon":"","title":"Remote_18_88:0:11:101","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_88:0:11:102","metrics":{"icon":"","title":"Remote_18_88:0:11:102","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_88:0:8","metrics":{"icon":"","title":"Remote_18_88:0:8","level":"on","change":"upstop"},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_88:0:5","metrics":{"icon":"","title":"Remote_18_88:0:5","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_88:0:11:103","metrics":{"icon":"","title":"Remote_18_88:0:11:103","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_88:0:11:105","metrics":{"icon":"","title":"Remote_18_88:0:11:105","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_88:0:0","metrics":{"icon":"","title":"Remote_18_88:0:0","level":"off","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_88:0:9:83","metrics":{"icon":"","title":"Remote_18_88:0:9:83","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_88:0:9:85","metrics":{"icon":"","title":"Remote_18_88:0:9:85","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_88:0:9:84","metrics":{"icon":"","title":"Remote_18_88:0:9:84","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_88:0:9:86","metrics":{"icon":"","title":"Remote_18_88:0:9:86","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_88:0:2:11","metrics":{"icon":"","title":"Remote_18_88:0:2:11","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_88:0:2:12","metrics":{"icon":"","title":"Remote_18_88:0:2:12","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_88:0:6","metrics":{"icon":"","title":"Remote_18_88:0:6","level":"off","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_90:0:2","metrics":{"icon":"","title":"Remote_18_90:0:2","level":"off","change":"downstart"},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_90:0:1","metrics":{"icon":"","title":"Remote_18_90:0:1","level":"","change":"downstart"},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_90:0:1:11","metrics":{"icon":"","title":"Remote_18_90:0:1:11","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_90:0:1:12","metrics":{"icon":"","title":"Remote_18_90:0:1:12","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_90:0:1:13","metrics":{"icon":"","title":"Remote_18_90:0:1:13","level":"off","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_90:0:1:15","metrics":{"icon":"","title":"Remote_18_90:0:1:15","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_90:0:2:22","metrics":{"icon":"","title":"Remote_18_90:0:2:22","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_90:0:3:33","metrics":{"icon":"","title":"Remote_18_90:0:3:33","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_90:0:2:23","metrics":{"icon":"","title":"Remote_18_90:0:2:23","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_90:0:4:43","metrics":{"icon":"","title":"Remote_18_90:0:4:43","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_90:0:4:45","metrics":{"icon":"","title":"Remote_18_90:0:4:45","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_90:0:3:35","metrics":{"icon":"","title":"Remote_18_90:0:3:35","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_90:0:2:25","metrics":{"icon":"","title":"Remote_18_90:0:2:25","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_90:0:2:21","metrics":{"icon":"","title":"Remote_18_90:0:2:21","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_90:0:1:1","metrics":{"icon":"","title":"Remote_18_90:0:1:1","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_90:0:2:2","metrics":{"icon":"","title":"Remote_18_90:0:2:2","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_90:0:3:3","metrics":{"icon":"","title":"Remote_18_90:0:3:3","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_90:0:4:4","metrics":{"icon":"","title":"Remote_18_90:0:4:4","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_91:0:2","metrics":{"icon":"","title":"Remote_18_91:0:2","level":"off","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_91:0:6","metrics":{"icon":"","title":"Remote_18_91:0:6","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_7:0:2","metrics":{"icon":"","title":"Remote_18_7:0:2","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_9:0:1:13","metrics":{"icon":"","title":"Remote_18_9:0:1:13","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_9:0:3:33","metrics":{"icon":"","title":"Remote_18_9:0:3:33","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_9:0:4:43","metrics":{"icon":"","title":"Remote_18_9:0:4:43","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_9:0:2:23","metrics":{"icon":"","title":"Remote_18_9:0:2:23","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_9:0:1:11","metrics":{"icon":"","title":"Remote_18_9:0:1:11","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_9:0:2:21","metrics":{"icon":"","title":"Remote_18_9:0:2:21","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_9:0:2:22","metrics":{"icon":"","title":"Remote_18_9:0:2:22","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_9:0:2:25","metrics":{"icon":"","title":"Remote_18_9:0:2:25","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_17:0:2:11","metrics":{"icon":"","title":"Remote_18_17:0:2:11","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_17:0:2:13","metrics":{"icon":"","title":"Remote_18_17:0:2:13","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_17:0:2:15","metrics":{"icon":"","title":"Remote_18_17:0:2:15","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_17:0:2:2","metrics":{"icon":"","title":"Remote_18_17:0:2:2","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_18:0:1:11","metrics":{"icon":"","title":"Remote_18_18:0:1:11","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_18:0:1:13","metrics":{"icon":"","title":"Remote_18_18:0:1:13","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_18:0:1:15","metrics":{"icon":"","title":"Remote_18_18:0:1:15","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_18:0:3","metrics":{"icon":"","title":"Remote_18_18:0:3","level":"","change":"upstart"},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_18:0:4","metrics":{"icon":"","title":"Remote_18_18:0:4","level":"","change":"upstart"},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_18:0:2","metrics":{"icon":"","title":"Remote_18_18:0:2","level":"","change":"upstart"},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_18:0:1:1","metrics":{"icon":"","title":"Remote_18_18:0:1:1","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_18:0:1:12","metrics":{"icon":"","title":"Remote_18_18:0:1:12","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_22:0:2:2","metrics":{"icon":"","title":"Remote_18_22:0:2:2","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_22:0:3","metrics":{"icon":"","title":"Remote_18_22:0:3","level":"off","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_23:0:2:11","metrics":{"icon":"","title":"Remote_18_23:0:2:11","level":"off","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_24:0:2","metrics":{"icon":"","title":"Remote_18_24:0:2","level":"off","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_24:0:3","metrics":{"icon":"","title":"Remote_18_24:0:3","level":"off","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462199},{"id":"Remote_18_24:0:4","metrics":{"icon":"","title":"Remote_18_24:0:4","level":"off","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462200},{"id":"Remote_18_24:0:5","metrics":{"icon":"","title":"Remote_18_24:0:5","level":"on","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408462200},{"id":"DummyDevice_bn_25","metrics":{"probeTitle":"","scaleTitle":"","level":"on","icon":"","title":"Dummy 25"},"tags":["On"],"location":null,"deviceType":"switchBinary","updateTime":1408462200},{"id":"Remote_18_28:0:1","metrics":{"icon":"","title":"Remote_18_28:0:1","level":"","change":"downstart"},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408627655},{"id":"Remote_18_28:0:2","metrics":{"icon":"","title":"Remote_18_28:0:2","level":"","change":"upstart"},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408627655},{"id":"Remote_18_29:0:1","metrics":{"icon":"","title":"Remote_18_29:0:1","level":"off","change":"downstart"},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408627845},{"id":"Remote_18_29:0:2","metrics":{"icon":"","title":"Remote_18_29:0:2","level":"","change":"downstart"},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408627846},{"id":"Remote_18_30:0:1","metrics":{"icon":"","title":"Remote_18_30:0:1","level":"off","change":"upstart"},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408629421},{"id":"Remote_18_30:0:2","metrics":{"icon":"","title":"Remote_18_30:0:2","level":"on","change":"downstart"},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408629422},{"id":"Remote_18_31:0:2","metrics":{"icon":"","title":"Remote_18_31:0:2","level":"","change":"downstart"},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408629960},{"id":"Remote_18_31:0:1","metrics":{"icon":"","title":"Remote_18_31:0:1","level":"","change":"downstart"},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408629960},{"id":"ZWayVDev_32:0:128","metrics":{"probeTitle":"Battery","scaleTitle":"%","level":78,"icon":"battery","title":"Battery 32:0"},"tags":[],"location":null,"deviceType":"battery","updateTime":1408691299},{"id":"Remote_18_32:0:1","metrics":{"icon":"","title":"Remote_18_32:0:1","level":"on","change":"upstart"},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408693674},{"id":"Remote_18_32:0:2","metrics":{"icon":"","title":"Remote_18_32:0:2","level":"off","change":"upstart"},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408693674},{"id":"Remote_18_32:0:4","metrics":{"icon":"","title":"Remote_18_32:0:4","level":"off","change":""},"tags":[],"location":null,"deviceType":"switchControl","updateTime":1408692055},{"id":"ZWayVDev_33:0:48:1","metrics":{"probeTitle":"General purpose","scaleTitle":"","icon":"motion","level":"on","title":"Sensor 33:0:48:1"},"tags":[],"location":null,"deviceType":"sensorBinary","updateTime":1408714932},{"id":"ZWayVDev_33:0:128","metrics":{"probeTitle":"Battery","scaleTitle":"%","level":100,"icon":"battery","title":"Battery 33:0"},"tags":[],"location":null,"deviceType":"battery","updateTime":1408714932},{"id":"ZWayVDev_33:0:49:1","metrics":{"probeTitle":"Temperature","scaleTitle":"°C","level":25.7000008,"icon":"temperature","title":"Sensor 33:0:49:1"},"tags":[],"location":null,"deviceType":"sensorMultilevel","updateTime":1408714933},{"id":"ZWayVDev_33:0:49:3","metrics":{"probeTitle":"Luminiscence","scaleTitle":"Lux","level":278,"icon":"luminosity","title":"Sensor 33:0:49:3"},"tags":[],"location":null,"deviceType":"sensorMultilevel","updateTime":1408714933},{"id":"ZWayVDev_34:0:37","metrics":{"level":"off","icon":"switch","title":"Switch 34:0"},"tags":["Off"],"location":null,"deviceType":"switchBinary","updateTime":1408714959}]},"code":200,"message":"200 OK","error":null};
                        var positions = ["ZWayVDev_8:0:37","ZWayVDev_2:0:38","OpenWeather_20","ZWayVDev_14:0:37","ZWayVDev_5:0:38","ZWayVDev_6:0:37","ZWayVDev_11:2:37","ZWayVDev_12:0:38","ZWayVDev_11:1:37","ZWayVDev_30:0:37","ZWayVDev_28:0:38","ZWayVDev_23:0:37","ZWayVDev_25:0:37","ZWayVDev_35:0:37"];

                        that.collections.Devices.collection.add(
                            _.filter(obj.data.devices, function (device) {
                                return device.id.toLowerCase().indexOf('remote') === -1;
                            })
                        );
                    }, 1000);
                    */
                }
            });
        },
        getCollection: function (collectionName) {
            return this.collections[collectionName].collection;
        },
        registerHandler: function (collectionName, eventName, handler) {
            this.listenTo(this.collections[collectionName].collection, eventName, handler);
        },
        refresh: function () {
            var that = this;
            // get all collections
            Object.keys(that.collections).forEach(function (key) {
                that.collections[key].collection.fetch();
            });
        },
        start: function () {
            var that = this,
                default_sync_interval = 1000, // default interval ms
                filtered_collection_names = _.filter(Object.keys(that.collections), function (key) {
                    return that.collections[key].interval;
                }); // only collection with interval

            // get all collections
            console.log('Getting all collections');
            Object.keys(that.collections).forEach(function (key) {
                that.collections[key].collection.fetch();
            });

            console.log('Set interval ' + filtered_collection_names.join('|') + ' over ' + default_sync_interval + 'ms');
            // register intervals
            setInterval(function () {
                filtered_collection_names.forEach(function (key) {
                    that.collections[key].collection.fetch();
                });
            }, default_sync_interval);
        },
        _preFilterAjax: function () {
            var that = this,
                host = that.apiPort ? that.apiHost + ":" + that.apiPort : that.apiHost;

            $.ajaxPrefilter(function (options) {
                // Your server goes below
                options = options || {};
                _.extend(options, {
                    crossDomain: true,
                    dataType: 'json',
                    url: "http://" + host + "/ZAutomation/api/v1" + options.url
                });
            });
        },
        _getQueryParams: function (qs) {
            qs = qs.split("+").join(" ");

            var params = {}, tokens,
                re = /[?&]?([^=]+)=([^&]*)/g;

            while (tokens = re.exec(qs)) {
                params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
            }

            return params;
        }
    });
});
