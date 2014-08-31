define([
    //libs
    'react',
    'morearty',
    // components
    './components/header',
    './components/main',
    './components/footer',
    'Preferences'
], function (
    // libs
    React,
    Morearty,
    // components
    Header,
    Main,
    Footer,
    Preferences
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin],
        componentDidMount: function () {
            var binding = this.getDefaultBinding();

            this._routes = Object.freeze({
                'DASHBOARD': 'dashboard',
                'WIDGETS': 'widgets'
            });

            Router({
                '/': binding.set.bind(binding, 'nowShowing', this._routes.DASHBOARD),
                '/dashboard': binding.set.bind(binding, 'nowShowing', this._routes.DASHBOARD),
                '/widgets': binding.set.bind(binding, 'nowShowing', this._routes.WIDGETS)
            }).init();
        },

        render: function () {
            var _ = React.DOM,
                binding = this.getDefaultBinding();

            return _.div({ className: 'applications wrapper', 'data-app-id': 'home-automation' },
                Header({binding: binding}),
                Main({binding: binding}),
                Footer({binding: binding}),
                Preferences({binding: binding})
            );
        }
    });
});
