define(['marionette', '../app', '../layout', 'backbone', '../views/dashboard/view'], function(Marionette, App, Layout, Backbone, Dasboard) {
    'use strict';
    var appRouter, routerController, layout = new Layout();
    routerController = {
        showDashboard: function() {
            var DashboardView = new Dasboard();
            App.widgetsRegion.show(DashboardView)
        },
        showApplications: function() {
            log('show applications')
        },
        showWidgets: function() {
            log('show widgets')
        }
    };

    appRouter = Marionette.AppRouter.extend({
        initialize: function() {
            layout.clear();
        },
        appRoutes: {
            '': 'showDashboard',
            'dashboard': 'showDashboard',
            'applications': 'showApplications',
            'widgets': 'showWidgets'
        },
        controller: routerController
    });

    return appRouter;
});
