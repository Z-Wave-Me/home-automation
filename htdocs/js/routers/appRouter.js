define([
    'marionette',
    '../views/app',
    '../layout',
    'backbone',
    '../views/dashboard/view',
    '../views/applications/view',
    '../views/widgets/view'
], function (Marionette, App, Layout, Backbone, Dasboard, Applications, Widgets) {
    'use strict';
    var appRouter, routerController, layout = new Layout();
    routerController = {
        showDashboard: function () {
            var DashboardView = new Dasboard();
            App.widgetsRegion.show(DashboardView);
            layout.activateCurrentNav();
        },
        showApplications: function () {
            var ApplicationsView = new Applications();
            App.widgetsRegion.show(ApplicationsView);
            layout.activateCurrentNav();
        },
        showWidgets: function () {
            var WidgetsView = new Widgets();
            App.widgetsRegion.show(WidgetsView);
            layout.activateCurrentNav();
        }
    };

    appRouter = Marionette.AppRouter.extend({
        initialize: function () {
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
