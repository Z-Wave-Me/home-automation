requirejs.config({
    baseUrl: "js",
    paths : {
        // Major libraries
        jquery: '../bower_components/jquery/dist/jquery',
        // backbone
        underscore: '../bower_components/lodash/dist/lodash.underscore',
        backbone: '../bower_components/backbone/backbone',
        // advanced libs
        'jquery-ui': 'libs/vendor/jquery-ui-1.10.4.custom',
        alpaca: 'libs/alpaca/alpaca-full',
        // react
        react: '../bower_components/react/react-with-addons',
        morearty: '../bower_components/moreartyjs/dist/morearty',
        immutable: '../bower_components/immutable/dist/Immutable',
        director: '../bower_components/director/build/director',
        // ace
        ace: '../bower_components/ace-builds/src/ace',
        'theme-chrome': '../bower_components/ace-builds/src/theme-chrome',
        'mode-javascript': '../bower_components/ace-builds/src/mode-javascript',
        'mode-json': '../bower_components/ace-builds/src/mode-json',
        'worker-javascript': '../bower_components/ace-builds/src/worker-javascript',
        // require
        text: '../bower_components/requirejs-text/text',
        // templates
        templates: '../templates',
        // temp
        sticky: 'libs/home-automation/sticky'
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
            exports: 'React'
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
            name: 'Preferences', // default 'packagename'
            location: 'modules/preferences'//,
        },
        {
            name: 'ServerSync', // default 'packagename'
            location: 'modules/serversync'//,
        },
        {
            name: 'App',
            location: 'modules/core'
        },
        {
            name: 'Widgets',
            location: 'modules/widgets'
        },
        {
            name: 'CommonMixins',
            location: 'mixins/common'
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
    'App',
    'Preferences',
    'ServerSync',
    // helpers
    'helpers/js',
    // contexts
    'state/default',
    'state/preferences',
    'state/services',
    'state/data'
], function (
    // libraries
    Morearty,
    React,
    Immutable,
    Director,
    Sticky,
    // modules
    App,
    Preferences,
    ServerSync,
    // helpers
    HelpersJS,
    // bindings
    defaultBinding,
    preferencesBinding,
    servicesBinding,
    dataBinding
    ) {
    'use strict';

    var Ctx = Morearty.createContext(React, Immutable, {
            default: defaultBinding,
            preferences: preferencesBinding,
            services: servicesBinding,
            data: dataBinding
        }, {
            requestAnimationFrameEnabled: true
        }),
        Bootstrap = React.createClass({
            mixins: [Morearty.Mixin],
            componentWillMount: function () {
                Ctx.init(this);
            },

            render: function () {
                return React.withContext({ morearty: Ctx }, function () {
                    return App({
                        binding: {
                            default: Ctx.getBinding().sub('default'),
                            preferences: Ctx.getBinding().sub('preferences'),
                            services: Ctx.getBinding().sub('services'),
                            data: Ctx.getBinding().sub('data')
                        }
                    });
                });
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
            module: ServerSync
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