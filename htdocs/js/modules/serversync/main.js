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
        initialize: function (Ctx, _options) {
            _.bindAll(this, 'start', 'refresh',
                'regCollection', 'getCollection', 'registerHandler',
                '_preFilterAjax', '_getQueryParams');

            var that = this,
                options = _options || {},
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
        },
        regCollection: function (collectionObject) {
            var that = this,
                binding = that.Ctx.getBinding().sub('data');

            require([collectionObject.path], function (collection) {
                that.collections[collectionObject.name] = {
                    collection: new collection(),
                    interval: collectionObject.interval,
                    dependencies: collectionObject.dependencies || null
                };

                if (collectionObject.name === 'Notifications') {
                    that.registerHandler(collectionObject.name , 'error', function () {
                        binding.update('notificationsSeverity', function () {
                            return 'error';
                        });
                        binding.update('notificationsMessage', function () {
                            return 'No connection';
                        });
                    });

                    that.registerHandler(collectionObject.name , 'success', function () {
                        var counts = that.collections[collectionObject.name].groupCount(),
                            className,
                            message;

                        binding.update('notificationsSeverity', function () {
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

                        binding.update('notificationsMessage', function () {
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

                that.registerHandler(collectionObject.name , 'add', function (model) {
                    binding.update(collectionObject.name.toLowerCase(), function (items) {
                        return items.push(that.Ctx.Imm.Map(model.toJSON()));
                    });
                    binding.set(collectionObject.name + 'Count', that.collections[collectionObject.name].collection.length);

                    if (collectionObject.name === 'Devices') {
                        binding.set('devicesUpdateTime', that.collections[collectionObject.name].collection.updateTime || 0);
                        binding.set('deviceTags', _.uniq(_.flatten(that.collections[collectionObject.name].collection.map(function (device) { return device.get('tags'); }))));
                        binding.set('deviceTypes', _.uniq(_.flatten(that.collections[collectionObject.name].collection.map(function (device) { return device.get('deviceType'); }))));
                    }
                });

                if (Object.keys(that.collections).length === that.arrayCollections.length) {
                    Object.keys(that.collections).forEach(function (key) {
                        if (Boolean(that.collections[key].dependencies)) {
                            that.registerHandler(that.collections[key].dependencies, 'success', that.collections[collectionObject.name].collection.fetch);
                        }
                    });
                    setTimeout(function () {
                        //that.start();
                    }, 2000)
                }
            });
        },
        getCollection: function (collectionName) {
            return this.collections.hasOwnProperty(collectionName) ? this.collections[collectionName].collection : null;
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
                default_sync_interval = 10000, // default interval ms
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
                    //that.collections[key].collection.fetch();
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
