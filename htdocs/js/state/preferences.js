define([
    // libs
    'immutable'
], function (
    Immutable
    ) {
    'use strict';

    return Immutable.Map({
        activeNodeTreeId: 1,
        activeNodeTreeIdHistory: 1,
        backButtonEnabled: false,
        adding: false,
        editing: false,
        duplicating: false,
        searchString: '',
        leftPanelItems: '',
        leftPanelItemSelectedId: null,
        tree: Immutable.Map({
            id: 1,
            options: {
                name: 'main',
                leftPanel: false,
                searchPanel: false,
                componentName: '_main'
            },
            children: [
                {
                    id: 2,
                    options: {
                        name: 'general',
                        leftPanel: true,
                        searchPanel: true,
                        buttons: ['add', 'remove'],
                        componentName: '_main_general'
                    },
                    children: []
                },
                {
                    id: 3,
                    options: {
                        name: 'rooms',
                        leftPanel: true,
                        searchPanel: true,
                        buttons: ['add', 'remove'],
                        componentName: '_main_rooms'
                    },
                    children: [
                        {
                            id: 6,
                            options: {
                                name: 'general',
                                leftPanel: true,
                                searchPanel: true,
                                buttons: ['add', 'remove'],
                                componentName: '_main_rooms'
                            },
                            children: []
                        },
                        {
                            id: 7,
                            options: {
                                name: 'devices',
                                leftPanel: false,
                                searchPanel: false,
                                componentName: '_main_rooms_devices'
                            },
                            children: []
                        }
                    ]
                },
                {
                    id: 4,
                    options: {
                        name: 'widgets',
                        leftPanel: true,
                        searchPanel: true,
                        componentName: '_main_widgets'
                    },
                    children: []
                },
                {
                    id: 5,
                    options: {
                        name: 'automation',
                        leftPanel: true,
                        searchPanel: true,
                        componentName: '_main_automation'
                    },
                    children: []
                }
            ]
        })
    });
});

