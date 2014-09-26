define([
    //libs
    'morearty',
    // components
    './components/header',
    './components/main',
    './components/footer',
    'Preferences',
    'Notifications',
    // mixins
    'mixins/sync/sync-layer'
], function (
    // libs
    Morearty,
    // components
    Header,
    Main,
    Footer,
    Preferences,
    Notifications,
    // mixins
    sync_layer_mixin
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin, sync_layer_mixin],
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

            // enable autosync after update collection
            this.enableAutoSync();
        },
        render: function () {
            var that = this,
                _ = React.DOM,
                binding = this.getDefaultBinding();

            return _.div({ className: 'applications wrapper', 'data-app-id': 'home-automation' },
                Header({
                    binding: {
                        default: binding,
                        data: that.getBinding('data')
                    }
                }),
                Main({
                    binding: {
                        default: binding,
                        data: that.getBinding('data')
                    }
                }),
                Footer({binding: binding}),
                Preferences({binding: {
                    default: binding,
                    data: that.getBinding('data'),
                    preferences: that.getBinding('preferences')
                }}),
                binding.sub('notifications').val('show_popup') ? Notifications({
                    binding: {
                        default: binding,
                        data: that.getBinding('data'),
                        preferences: that.getBinding('preferences')
                    }
                }) : null
            );
        }
    });
});
