requirejs.config({
    baseUrl: "js",
    paths : {
        // Major libraries
        jquery: '../bower_components/jquery/dist/jquery',
        'jquery.cookie': '../bower_components/jquery-cookie/jquery.cookie',
        underscore: '../bower_components/lodash/dist/lodash.underscore',
        backbone: '../bower_components/backbone/backbone',
        'jquery-ui': 'libs/vendor/jquery-ui-1.10.4.custom',
        'colpick': 'libs/vendor/jquery.colpick',
        sticky: 'libs/home-automation/sticky',
        cookie : 'libs/vendor/jquery.cookie',
        dragsort : 'libs/vendor/jquery.dragsort',
        magicsuggest: 'libs/vendor/magicsuggest-1.3.1',
        alpaca: 'libs/alpaca/alpaca-full',
        ace: 'libs/acejs/ace',
        'theme-chrome': 'libs/acejs/theme-chrome',
        'mode-javascript': 'libs/acejs/mode-javascript',
        'mode-json': 'libs/acejs/mode-json',
        'worker-javascript': 'libs/acejs/worker-javascript',
        react: '../bower_components/react/react-with-addons',
        'react.backbone': '../bower_components/react.backbone/react.backbone',
        JSXTransformer: '../bower_components/jsx-requirejs-plugin/js/JSXTransformer-0.11.0',
        jsx: '../bower_components/jsx-requirejs-plugin/js/jsx',
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
        'react.backbone': {
            deps: ['react', 'backbone']
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
    jsx: {
        fileExtension: '.jsx'
    },
    // modules
    packages: [
        {
            name: 'LayoutModule', // default 'packagename'
            location: 'modules/layout'//,
        },
        {
            name: 'FiltersModule', // default 'packagename'
            location: 'modules/filters'//,
        },
        {
            name: 'PreferencesModule', // default 'packagename'
            location: 'modules/preferences'//,
        },
        {
            name: 'ServerSyncModule', // default 'packagename'
            location: 'modules/serversync'//,
        },
        {
            name: 'DashboardModule',
            location: 'modules/dashboard'
        },
        {
            name: 'CoreModule',
            location: 'modules/core'
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
    'LayoutModule',
    'FiltersModule',
    'PreferencesModule',
    'ServerSyncModule',
    'DashboardModule',
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
    LayoutModule,
    FiltersModule,
    PreferencesModule,
    ServerSyncModule,
    DashboardModule,
    // helpers
    HelpersJS
    ) {
    'use strict';

    var Ctx = Morearty.createContext(React, Immutable, {
            nowShowing: 'dashboard', // start route
            notificationsCount: 0,
            notificationsSeverity: 'ok', // ok, warning, error, debug
            notificationsMessage: 'ok',
            overlayShow: false,
            overlayShowName: null
        }, {requestAnimationFrameEnabled: true}),
        Bootstrap = Ctx.createClass({
            componentWillMount: function () {
                Ctx.init(this);
            },

            render: function () {
                var App = Sticky.get('App.Modules.Core').getClass();
                return App({ state: Ctx.state()});
            }
        }),
        OverlayLayer = Ctx.createClass({
            render: function () {
                return Sticky.get('App.Modules.Preferences').getClass()({ state: Ctx.state()});
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
            name: 'App.Modules.Core',
            module: CoreModule
        },
        {
            name: 'App.Modules.Preferences',
            module: PreferencesModule
        }
        /*
        {
            name: 'App.Modules.Layout',
            module: LayoutModule
        },

        {
            name: 'App.Modules.Dashboard',
            module: DashboardModule
        }*/
    ].forEach(function (options) {
        Sticky.set(options.name, options.module, options.params || {}, Ctx);
    });

    // render core components
    Ctx.React.renderComponent(
        Bootstrap(),
        document.getElementById('app-container')
    );

    // render overlay component
    Ctx.React.renderComponent(
        OverlayLayer(),
        document.getElementById('overlay-region')
    );


});