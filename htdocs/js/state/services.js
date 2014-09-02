define([], function () {
    'use strict';

    return {
        defaultInterval: 10000,
        collections: [
            {
                id: 'devices',
                url: '/devices',
                autoSync: true,
                methods: ['READ'],
                modelsDiffField: 'deviceType',
                models: [
                    {
                        type: 'default',
                        methods: ['READ', 'UPDATE']
                    }
                ]
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
                id: 'profiles',
                url: '/profiles',
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
                ]
            }
        ]
    };
});

