define([
    //libs
    // components
    './components/header',
    './components/main',
    './components/footer'
], function (
    // libs
    // components
    HeaderComponent,
    MainComponent,
    FooterComponent
    ) {
    'use strict';

    return function (Ctx, _options) {
        var that = this,
            options = _options || {},
            Header = new HeaderComponent(Ctx),
            Main = new MainComponent(Ctx),
            Footer = new FooterComponent(Ctx),
            Preferences = Sticky.get('App.Modules.Preferences');

        that._routes = Object.freeze({
            'DASHBOARD': 'dashboard',
            'WIDGETS': 'widgets'
        });

        return Ctx.createClass({
            componentDidMount: function () {
                var state = this.getState();
                Router({
                    '/': state.set.bind(state, 'nowShowing', that._routes.DASHBOARD),
                    '/dashboard': state.set.bind(state, 'nowShowing', that._routes.DASHBOARD),
                    '/widgets': state.set.bind(state, 'nowShowing', that._routes.WIDGETS)
                }).init();
            },

            render: function () {
                var __ = Ctx.React.DOM;
                return __.div({ className: 'applications wrapper', 'data-app-id': 'home-automation' },
                    Header({state: this.getState()}),
                    Main({state: this.getState()}),
                    Footer({state: this.getState()}),
                    Preferences({state: this.getState()})
                );
            }
        });
    }
});
