define([
    // libs
    'immutable'
], function (
    // libs
    Immutable
    ) {
    'use strict';

    return {
        nowShowing: 'dashboard', // start route
        // notifications
        notifications: {
            count: 0,
            severity: 'ok',
            show_popup: false,
            severity_modes: {
                'error_connection': {
                    message: 'No connection',
                    color: 'red'
                },
                ok: {
                    message: 'Ok',
                    color: 'grey'
                },
                warning: {
                    message: 'Warning',
                    color: 'yellow'
                },
                critical: {
                    message: 'Critical',
                    color: 'red'
                },
                debug: {
                    message: 'Debug',
                    color: 'blue'
                }
            },
            filters: {
                ok: true,
                warning: true,
                critical: true,
                debug: true
            },
            full_view_notice_id: null
        },
        // menu settings
        primaryFilter: 'all',
        secondaryFilter: '',
        searchString: '',
        //
        overlayShow: false,
        overlayShowName: null
    };
});

