define([], function () {
    'use strict';

    return {
        defaultInterval: 10000,
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
                }
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
                        devices_binding = dataBinding.sub('devices'),
                        helpers = Sticky.get('App.Helpers.JS'),
                        tags = helpers.arrayUnique(helpers.flatten(response.data.devices.map(function(device) {
                            return device.tags;
                        }))),
                        types = helpers.arrayUnique(helpers.flatten(response.data.devices.map(function(device) {
                            return device.deviceType;
                        })));

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
                    if (tags.length > 0) {
                        dataBinding.merge('deviceTags', Immutable.fromJS(tags));
                    }

                    // update types
                    if (types.length > 0) {
                        dataBinding.merge('deviceTypes', Immutable.fromJS(types));
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
                delay: 2000
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
                }
            },
            {
                id: 'namespaces',
                url: '/namespaces',
                methods: ['READ'],
                model: {
                    methods: ['READ'],
                    defaults: null
                }
            },
            {
                id: 'modules_categories',
                url: '/modules/categories',
                methods: ['READ'],
                model: {
                    methods: ['READ'],
                    defaults: {}
                }
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
                }
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
                }
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
                }
            }
        ]
    };
});

