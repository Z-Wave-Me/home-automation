define([
    // libs
    'immutable'
], function (
    Immutable
    ) {
    'use strict';

    return Immutable.Map({
        activeNodeTreeId: 1,
        activeNodeTreeStatus: 'normal', // update, add, remove
        activeNodeTreeIdHistory: 1,
        backButtonEnabled: false,
        adding: false,
        editing: false,
        duplicating: false,
        searchString: '',
        searchStringLeftPanel: '',
        leftPanelItems: '',
        itemBindingTemp: {},
        leftPanelItemSelectedId: null,
        defaultProfileId: localStorage.getItem('defaultProfileId'),
        tree: Immutable.Map({
            id: 1,
            options: {
                name: 'Preferences',
                leftPanel: false,
                searchPanel: false,
                componentName: 'main_menu',
                noRequiredModel: true
            },
            children: [
                {
                    id: 2,
                    options: {
                        name: 'Profiles',
                        leftPanel: true,
                        searchPanel: true,
                        buttons: ['add', 'remove'],
                        componentName: '_profile',
                        serviceId: 'profiles'
                    },
                    children: []
                },
                {
                    id: 3,
                    options: {
                        name: 'Rooms',
                        leftPanel: true,
                        searchPanel: true,
                        buttons: ['add', 'remove'],
                        componentName: '_room',
                        serviceId: 'locations'
                    },
                    children: []
                },
                {
                    id: 4,
                    options: {
                        name: 'Widgets',
                        leftPanel: true,
                        searchPanel: true,
                        componentName: '_widget',
                        serviceId: 'devices'
                    },
                    children: []
                },
                {
                    id: 5,
                    options: {
                        name: 'Automation',
                        leftPanel: false,
                        searchPanel: false,
                        componentName: 'instances_menu',
                        serviceId: 'instances',
                        noRequiredModel: true
                    },
                    children: []
                },
                {
                    id: 6,
                    options: {
                        name: 'Modules',
                        leftPanel: false,
                        searchPanel: false,
                        componentName: 'modules_menu',
                        serviceId: 'modules',
                        noRequiredModel: true
                    },
                    children: []
                }
            ]
        })
    });
});

