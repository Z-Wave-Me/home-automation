require.config({
    baseUrl: "js/",
    deps: ['main'],
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
    ],
    optimize: "uglify2",
    uglify: {
        toplevel: true,
        ascii_only: true,
        beautify: true,
        max_line_length: 1000,
        compress: false
    }
});
