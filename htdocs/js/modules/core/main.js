define([
    //libs
    'backbone',
    // components
    './components/header',
    './components/main',
    './components/footer'
], function (
    // libs
    Backbone,
    HeaderComponent,
    MainComponent,
    FooterComponent
    ) {
    'use strict';

    return Backbone.View.extend({
        initialize: function (options, context) {
            _.bindAll(this, '_createClass', 'getClass');
            var that = this;

            _.extend(that, {
                options: _.extend({}, options || {}),
                Ctx: context
            });

            that._createClass();
        },
        getClass: function () {
            return this.MoreartyClass;
        },
        _createClass: function () {
            var that = this,
                Header = new HeaderComponent({}, that.Ctx),
                Main = new MainComponent({}, that.Ctx),
                Footer = new FooterComponent({}, that.Ctx);

            that.MoreartyClass = that.Ctx.createClass({
                componentDidMount: function () {
                    var state = this.getState();
                    Router({
                        '/': state.set.bind(state, 'nowShowing', that._routes.DASHBOARD),
                        '/dashboard': state.set.bind(state, 'nowShowing', that._routes.DASHBOARD),
                        '/widgets': state.set.bind(state, 'nowShowing', that._routes.WIDGETS)
                    }).init();
                },

                render: function () {
                    var __ = that.Ctx.React.DOM;
                    return __.div({ className: 'applications wrapper', 'data-app-id': 'home-automation' },
                        Header.getClass(this.getState()),
                        Main.getClass(this.getState()),
                        Footer.getClass(this.getState()),
                        Sticky.get('App.Modules.Preferences').getClass(this.getState())
                    );
                }
            });
        },
        _routes: Object.freeze({
            'DASHBOARD': 'dashboard',
            'WIDGETS': 'widgets'
        })
    });
});
