define([
    'backbone',
    'vm',
    'helpers/utils'
], function (Backbone, Vm, Utils) {
    'use strict';
    var AppRouter = Backbone.Router.extend({
            routes: {
                'widgets': 'widgets',
                'applications': 'applications',
                'dashboard': 'dashboard',
                '*dashboard': 'dashboard' // All urls will trigger this router
            }
        }),
        initialize = function (options) {
            var appView = options.appView,
                router = new AppRouter(options);

            router.on('all', function () {
                Utils.activateCurrentNav();
            });


            function register(route, path, name) {
                router.on(route, function (arg1, arg2) {
                    require([path], function (View) {
                        Vm.create(appView, name, View).render(arg1, arg2);
                    });
                });
            }

            register('route:dashboard',    'views/dashboard/view',        'DashboardView');
            register('route:applications',    'views/applications/view',        'ApplicationsView');
            register('route:widgets',    'views/widgets/view',        'WidgetsView');
        };

    return {
        initialize: initialize
    };
});
