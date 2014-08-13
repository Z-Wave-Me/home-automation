requirejs.config({
    baseUrl: "js",
    paths : {
        // Major libraries
        jquery: '../bower_components/jquery/dist/jquery',
        underscore: '../bower_components/lodash/dist/lodash.underscore',
        backbone: '../bower_components/backbone/backbone',
        'backbone-controller': '../bower_components/backbone.controller/backbone.controller',
        mem: '../bower_components/mem.js/mem',
        'jquery-ui': 'libs/vendor/jquery-ui-1.10.4.custom',
        'colpick': 'libs/vendor/jquery.colpick',
        cookie : 'libs/vendor/jquery.cookie',
        dragsort : 'libs/vendor/jquery.dragsort',
        magicsuggest: 'libs/vendor/magicsuggest-1.3.1',
        alpaca: 'libs/alpaca/alpaca-full',
        ace: 'libs/acejs/ace',
        'theme-chrome': 'libs/acejs/theme-chrome',
        'mode-javascript': 'libs/acejs/mode-javascript',
        'mode-json': 'libs/acejs/mode-json',
        'worker-javascript': 'libs/acejs/worker-javascript',
        // ractive
        ractive: '../bower_components/ractive/ractive',
        'ractive-adaptors-backbone': '../bower_components/ractive-adaptors-backbone/ractive-adaptors-backbone',
        'ractive-events-tap': '../bower_components/ractive-events-tap/ractive-events-tap',
        'ractive-events-hover': '../bower_components/ractive-events-hover/ractive-events-hover',
        'ractive-events-keys': '../bower_components/ractive-events-keys/ractive-events-keys',
        'ractive-events-draggable': 'libs/ractive/ractive-events-draggable',
        'ractive-transitions-fade': '../bower_components/ractive-transitions-fade/Ractive-transitions-fade',
        'ractive-transitions-slide': '../bower_components/ractive-transitions-slide/Ractive-transitions-slide',
        'ractive-decorators-tooltip': 'libs/ractive/ractive-decorators-tooltip',
        text: '../bower_components/requirejs-text/text',
        templates: '../templates'
    },
    map: {
        '*': {
            'lodash': 'underscore',
            'Ractive': 'ractive',
            'Backbone': 'backbone'
        }
    },
    shim : {
        jquery : {
            exports : '$'
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
        'backbone-controller': {
            deps: ['backbone']
        },
        mem: {
            deps: ['underscore'],
            exports: 'Mem'
        },
        ractive: {
            deps: ['backbone'],
            exports: 'Ractive'
        },
        'ractive-adaptors-backbone': {
            deps: ['backbone', 'ractive']
        },
        'ractive-events-tap': {
            deps: ['ractive']
        },
        'ractive-events-hover': {
            deps: ['ractive']
        },
        'ractive-events-keys': {
            deps: ['ractive']
        },
        'ractive-events-draggable': {
            deps: ['ractive']
        },
        'ractive-transitions-fade': {
            deps: ['ractive', 'ractive-events-tap']
        },
        'ractive-transitions-slide': {
            deps: ['ractive', 'ractive-events-tap']
        },
        'ractive-decorators-tooltip': {
            deps: ['ractive']
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
        }
    },
    packages: [
        {
            name: 'PreferencesModule', // default 'packagename'
            location: 'modules/preferences'//,
            //main: 'main' // default 'main'
        }
    ]
});

require([
    'backbone',
    'ractive',
    'mem',
    'views/app',
    'router',
    'PreferencesModule',
    'vm'
], function (Backbone, Ractive, Mem, AppView, Router, PreferencesModule, Vm) {
    'use strict';

    // register module
    [
        'PreferencesModule'
    ].forEach(function (moduleName) {
        Mem.set(moduleName, PreferencesModule, {});
    });

    // init AppView
    AppView = Vm.create({}, 'AppView', AppView);
    Router.initialize({appView: AppView});
    AppView.render();
});