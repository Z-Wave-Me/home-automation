define([], function () {
    'use strict';

    return {
        defaultInterval: 10000,
        collections: [
            {
                id: 'profiles',
                url: '/profiles',
                methods: ['READ', 'CREATE'],
                postSyncHandler: function (ctx, response) {
                    var dataBinding = ctx.getBinding().sub('data'),
                        activeProfile = response.data.filter(function (profile) {
                            return String(profile.id) === localStorage.getItem('defaultProfileId');
                        })[0];

                    dataBinding.set('devicesOnDashboard', activeProfile.positions ? activeProfile.positions : []);
                },
                models: [
                    {
                        type: 'default',
                        methods: ['READ', 'UPDATE', 'DELETE']
                    }
                ]
            },
            {
                id: 'devices',
                url: '/devices',
                autoSync: true,
                methods: ['READ'],
                modelsDiffField: 'deviceType',
                postSyncHandler: function (ctx, response) {
                    var dataBinding = ctx.getBinding().sub('data'),
                        helpers = Sticky.get('App.Helpers.JS'),
                        tags = helpers.arrayUnique(helpers.flatten(response.data.devices.map(function(device) {
                            return device.tags;
                        }))),
                        types = helpers.arrayUnique(helpers.flatten(response.data.devices.map(function(device) {
                            return device.deviceType;
                        })));

                    dataBinding.set('devicesUpdateTime', response.data.updateTime || 0);
                    dataBinding.set('deviceTags', tags);
                    dataBinding.set('deviceTypes', types);
                },
                parse: function (response) {
                    return response.data.devices;
                },
                models: [
                    {
                        type: 'default',
                        methods: ['READ', 'UPDATE']
                    }
                ],
                delay: 1000
            },
            {
                id: 'locations',
                url: '/locations',
                methods: ['READ', 'CREATE'],
                models: [
                    {
                        type: 'default',
                        methods: ['READ', 'UPDATE', 'DELETE']
                    }
                ]
            },
            {
                id: 'modules',
                url: '/modules',
                methods: ['READ'],
                models: [
                    {
                        type: 'default',
                        methods: ['READ']
                    }
                ]
            },
            {
                id: 'instances',
                url: '/instances',
                methods: ['READ', 'CREATE'],
                models: [
                    {
                        type: 'default',
                        methods: ['READ', 'UPDATE', 'DELETE']
                    }
                ]
            },
            {
                id: 'notifications',
                url: '/notifications',
                autoSync: true,
                methods: ['READ', 'UPDATE', 'DELETE'],
                models: [
                    {
                        type: 'default',
                        methods: ['READ', 'UPDATE', 'DELETE']
                    }
                ],
                parse: function (response) {
                    return response.data.notifications;
                }
            }
        ]
    };
});

