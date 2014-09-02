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
        notificationsCount: 0,
        notificationsSeverity: 'ok', // ok, warning, error, debug
        notificationsMessage: 'ok',
        notifications: [],
        devices: [],
        namespaces: [],
        modules: [],
        instances: [],
        locations: [],
        profiles: [],
        primaryFilter: 'all',
        secondaryFilter: '',
        overlayShow: false,
        overlayShowName: null
    };
});

