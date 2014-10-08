requirejs.config({
    baseUrl: "js",
    paths : {
        // Major libraries
        jquery: '../bower_components/jquery/dist/jquery',
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
    shim : {
        jquery : {
            exports : '$'
        },
        'jquery-ui': {
            deps: ['jquery']
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
            name: 'Preferences',
            location: 'modules/preferences'//,
        },
        {
            name: 'Notifications',
            location: 'modules/notifications'//,
        },
        {
            name: 'App',
            location: 'modules/core'
        },
        {
            name: 'Widgets',
            location: 'modules/widgets'
        }
    ]
});

require([
    // libraries
    'react',
    'immutable',
    'director',
    'sticky',
    // helpers
    'helpers/js',
    // contexts
    'state/default',
    'state/preferences',
    'state/services',
    'state/data'
], function (
    // libraries
    React,
    Immutable,
    Director,
    Sticky,
    // helpers
    HelpersJS,
    // bindings
    defaultBinding,
    preferencesBinding,
    servicesBinding,
    dataBinding
    ) {
    'use strict';

    window.React = React;
    window.Immutable = Immutable;

    require(['morearty'], function (Morearty) {
        var Ctx = Morearty.createContext({
            default: Immutable.fromJS(defaultBinding),
            preferences: Immutable.fromJS(preferencesBinding),
            services: Immutable.fromJS(servicesBinding),
            data: Immutable.fromJS(dataBinding)
        }, {
            requestAnimationFrameEnabled: true
        });

        // reg module in global namespace
        Sticky.set('App.Helpers.JS', HelpersJS, Ctx, {});

        require(['./bootstrap'], function (Bootstrap) {
            // render bootstrap
            React.renderComponent(
                Bootstrap({ctx: Ctx}),
                document.getElementById('app-container')
            );
        });

    });
});