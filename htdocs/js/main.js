requirejs.config({
    baseUrl: "js",
    paths : {
        // Major libraries
        jquery: '../bower_components/jquery/dist/jquery',
        underscore: '../bower_components/lodash/dist/lodash.underscore',
        backbone: '../bower_components/backbone/backbone',
        'jquery-ui': 'libs/vendor/jquery-ui-1.10.4.custom',
        'colpick': 'libs/vendor/jquery.colpick',
        sticky: 'libs/home-automation/sticky',
        dragsort : 'libs/vendor/jquery.dragsort',
        magicsuggest: 'libs/vendor/magicsuggest-1.3.1',
        alpaca: 'libs/alpaca/alpaca-full',
        ace: 'libs/acejs/ace',
        react: '../bower_components/react/react-with-addons',
        jsx: '../bower_components/jsx-requirejs-plugin/js/jsx',
        JSXTransformer: '../bower_components/jsx-requirejs-plugin/js/JSXTransformer-0.11.0',
        'theme-chrome': 'libs/acejs/theme-chrome',
        'mode-javascript': 'libs/acejs/mode-javascript',
        'mode-json': 'libs/acejs/mode-json',
        'worker-javascript': 'libs/acejs/worker-javascript',
        text: '../bower_components/requirejs-text/text',
        immutable: '../bower_components/immutable/dist/immutable',
        director: '../bower_components/director/build/director',
        morearty: '../bower_components/moreartyjs/dist/morearty',
        templates: '../templates'
    },
    map: {
        '*': {
            'lodash': 'underscore',
            'Backbone': 'backbone'
        }
    },
    shim : {
        jquery : {
            exports : '$'
        },
        'jquery.cookie': {
            deps: ['jquery']
        },
        'jquery-ui': {
            deps: ['jquery']
        },
        cookie : {
            deps: ['jquery'],
            exports : '$.cookie'
        },
        dragsort : {
            deps: ['jquery'],
            exports : '$.dragsort'
        },
        magicsuggest: {
            deps: ['jquery'],
            exports: '$.magicsuggest'
        },
        drags: {
            deps: ['jquery'],
            exports: '$.drags'
        },
        underscore : {
            exports : '_'
        },
        backbone : {
            deps : ['jquery', 'underscore'],
            exports : 'Backbone'
        },
        sticky: {
            exports: 'Sticky'
        },
        ace: {
            deps : ['jquery']
        },
        'mode-javascript': {
            deps : ['ace']
        },
        'mode-json': {
            deps : ['ace']
        },
        'theme-chrome': {
            deps : ['ace']
        },
        'worker-javascript': {
            deps : ['ace']
        },
        alpaca: {
            deps: ['jquery', 'ace', 'mode-javascript', 'mode-json', 'jquery-ui', 'theme-chrome', 'worker-javascript']
        },
        'colpick': {
            deps: ['jquery']
        },
        react: {
            exports: 'React',
            deps: ['jsx', 'JSXTransformer']
        },
        director: {
            exports: 'Router'
        },
        immutable: {
            exports: 'Immutable'
        },
        morearty: {
            exports: 'Morearty',
            deps: ['immutable', 'react']
        }
    },
    // modules
    packages: [
        {
            name: 'PreferencesModule', // default 'packagename'
            location: 'modules/preferences'//,
        },
        {
            name: 'ServerSyncModule', // default 'packagename'
            location: 'modules/serversync'//,
        },
        {
            name: 'CoreModule',
            location: 'modules/core'
        },
        {
            name: 'WidgetsModule',
            location: 'modules/widgets'
        }
    ]
});

require([
    // components
    'morearty',
    'react',
    'immutable',
    'director',
    'sticky',
    // modules
    'CoreModule',
    'PreferencesModule',
    'ServerSyncModule',
    'WidgetsModule',
    // helpers
    'helpers/js'
], function (
    // libraries
    Morearty,
    React,
    Immutable,
    Director,
    Sticky,
    // modules
    CoreModule,
    PreferencesModule,
    ServerSyncModule,
    WidgetsModule,
    // helpers
    HelpersJS
    ) {
    'use strict';

    var Ctx = Morearty.createContext(React, Immutable, {
            nowShowing: 'dashboard', // start route
            notifications: [],
            notificationsCount: 0,
            notificationsSeverity: 'ok', // ok, warning, error, debug
            notificationsMessage: 'ok',
            devices: [],
            namespaces: [],
            modules: [],
            instances: [],
            locations: [],
            profiles: [],
            primaryFilter: 'all',
            secondaryFilter: '',
            devicesCount: 0,
            devicesUpdateTime: 0,
            overlayShow: false,
            overlayShowName: null,
            deviceTypes: [],
            deviceTags: [],
            preferences: Immutable.Map({
                activeNodeTreeId: 1,
                backButtonEnabled: false,
                adding: false,
                editing: false,
                duplicating: false,
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
                                button: ['add', 'remove'],
                                component: '_main_general'
                            }
                        },
                        {
                            id: 3,
                            options: {
                                name: 'rooms',
                                leftPanel: true,
                                searchPanel: true,
                                button: ['add', 'remove'],
                                component: '_main_rooms'
                            },
                            children: [
                                {
                                    id: 5,
                                    options: {
                                        name: 'general',
                                        leftPanel: true,
                                        searchPanel: true,
                                        button: ['add', 'remove'],
                                        component: '_main_rooms_general'
                                    }
                                },
                                {
                                    id: 6,
                                    options: {
                                        name: 'devices',
                                        leftPanel: true,
                                        searchPanel: true,
                                        component: '_main_rooms_devices'
                                    }
                                }
                            ]
                        },
                        {
                            id: 4,
                            options: {
                                name: 'widgets',
                                leftPanel: true,
                                searchPanel: true,
                                component: '_main_widgets'
                            }
                        },
                        {
                            id: 5,
                            options: {
                                name: 'automation',
                                leftPanel: true,
                                searchPanel: true,
                                component: '_main_automation'
                            }
                        }
                    ]
                })
            }),
        }, {
            requestAnimationFrameEnabled: true
        }),
        Bootstrap = Ctx.createClass({
            componentWillMount: function () {
                Ctx.init(this);
            },

            render: function () {
                var App = Sticky.get('App.Modules.Core');
                return App({ state: Ctx.state()});
            }
        });

    // reg module in global namespace
    [
        {
            name: 'App.Helpers.JS',
            module: HelpersJS
        },
        {
            name: 'App.Modules.ServerSync',
            module: ServerSyncModule
        },
        {
            name: 'App.Modules.Preferences',
            module: PreferencesModule
        },
        {
            name: 'App.Modules.Widgets',
            module: WidgetsModule
        },
        {
            name: 'App.Modules.Core',
            module: CoreModule
        }
    ].forEach(function (options) {
        Sticky.set(options.name, options.module, Ctx, options.params);
    });

    // render core components
    Ctx.React.renderComponent(
        Bootstrap(),
        document.getElementById('app-container')
    );
});