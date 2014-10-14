define([], function () {
    'use strict';

    return {
        defaultInterval: 2000,
        collections: [
            {
                id: 'profiles',
                url: '/profiles',
                methods: ['READ', 'CREATE'],
                model: {
                    methods: ['READ', 'UPDATE', 'DELETE'],
                    defaults: {
                        id: null,
                        name: '',
                        description: '',
                        positions: []
                    }
                },
                loaded: false
            },
            {
                id: 'devices',
                url: '/devices',
                autoSync: true,
                sinceField: 'devicesUpdateTime',
                methods: ['READ'],
                postSyncHandler: function (ctx, response) {
                    var that = this,
                        remove_devices_ids,
                        dataBinding = ctx.getBinding().sub('data'),
                        devices_binding = dataBinding.sub('devices');

                    // set updateTime
                    dataBinding.set('devicesUpdateTime', response.data.updateTime || 0);

                    // update devices
                    response.data.devices.forEach(function(device) {
                        var index = that._getIndexModelFromCollection(device.id, 'devices');
                        if (index !== -1) {
                            that._updateModel(device, 'devices');
                        } else {
                            that._addModel(device, 'devices');
                        }
                    });

                    // remove old device
                    if (response.data.structureChanged) {
                        remove_devices_ids = devices_binding.val().filter(function (device) {
                            return response.data.devices.every(function (d) {
                                return device.get('id') !== d.id;
                            });
                        }).map(function (device) {
                            return device.id;
                        }).toJS();

                        if (remove_devices_ids.length > 0) {
                            that._removeModel(remove_devices_ids, 'devices');
                        }
                    }

                    // update tags
                    if (devices_binding.val()) {
                        dataBinding.update('deviceTags', function () {
                            var tags = devices_binding.val().reduce(function (memo, device, index) {
                                memo = index === 1 ? Immutable.Vector() : memo;

                                var device_tags = device.get('tags');

                                if (device_tags.length > 0) {
                                    var filtered_tags = device_tags.filter(function (t) {
                                        return memo.indexOf(t) === -1;
                                    });
                                    return memo.concat(filtered_tags.toJS());
                                } else {
                                    return memo;
                                }
                            }) || Immutable.Vector();

                            return tags.sort();
                        });
                    }

                    // update types
                    if (devices_binding.val()) {
                        dataBinding.update('deviceTypes', function () {
                            var types = devices_binding.val().reduce(function (memo, device, index) {
                                memo = index === 1 ? Immutable.Vector() : memo;

                                if (memo.indexOf(device.get('deviceType')) === -1) {
                                    return memo.push(device.get('deviceType'));
                                } else {
                                    return memo;
                                }
                            }) || Immutable.Vector();

                            return types.sort();
                        });
                    }
                },
                parse: function (response, ctx) {
                    return response.data.devices;
                },
                model: {
                    methods: ['READ', 'UPDATE', 'DELETE'],
                    defaults: {
                        id: null,
                        deviceType: 'none',
                        location: null,
                        metrics: {title: 'noname'},
                        tags: [],
                        permanently_hidden: false
                    }
                },
                delay: 2000,
                loaded: false
            },
            {
                id: 'locations',
                url: '/locations',
                methods: ['READ', 'CREATE'],
                model: {
                    methods: ['READ', 'UPDATE', 'DELETE'],
                    defaults: {
                        id: null,
                        name: 'Default name',
                        icon: null
                    }
                },
                loaded: false
            },
            {
                id: 'namespaces',
                url: '/namespaces',
                methods: ['READ'],
                model: {
                    methods: ['READ'],
                    defaults: null
                },
                loaded: false
            },
            {
                id: 'modules_categories',
                url: '/modules/categories',
                methods: ['READ'],
                model: {
                    methods: ['READ'],
                    defaults: {}
                },
                loaded: false
            },
            {
                id: 'modules',
                url: '/modules',
                methods: ['READ'],
                model: {
                    methods: ['READ', 'UPDATE', 'DELETE'],
                    defaults: {
                        id: null,
                        name: 'Default name',
                        icon: null
                    }
                },
                parse: function (response, ctx) {
                    return response.data.map(function (model) {
                        return Sticky.get('App.Helpers.JS').getNamespacesData(ctx, model);
                    });
                },
                loaded: false
            },
            {
                id: 'instances',
                url: '/instances',
                methods: ['READ', 'CREATE'],
                model: {
                    methods: ['READ', 'UPDATE', 'DELETE'],
                    defaults: {
                        id: null,
                        moduleId: null,
                        params: {},
                        group: 'default_group'
                    }
                },
                loaded: false
            },
            {
                id: 'notifications',
                url: '/notifications',
                autoSync: true,
                sinceField: 'notificationsUpdateTime',
                methods: ['READ', 'UPDATE', 'DELETE'],
                models: [
                    {
                        type: 'default',
                        methods: ['READ', 'UPDATE', 'DELETE']
                    }
                ],
                postSyncHandler: function (ctx, response) {
                    var data_binding = ctx.getBinding().sub('data')

                    data_binding.set('notificationsUpdateTime', response.data.updateTime || 0);
                },
                parse: function (response) {
                    return response.data.notifications;
                },
                loaded: false
            }
        ]
    };
});

