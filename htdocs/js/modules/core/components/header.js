define([
    //libs
    'morearty',
    // components
    './filters'
], function (
    // libs
    Morearty,
    // components
    Filters
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin],
        onShowPreferences: function () {
            this.getDefaultBinding().set('overlayShow', true);
            return false;
        },
        toggleShowNotificationsPopup: function () {
            var binding = this.getDefaultBinding(),
                show = binding.sub('notifications').val('show_popup');

            binding.sub('notifications').set('show_popup', !show);

            return false;
        },
        isShownFilters: function () {
            var binding = this.getDefaultBinding();

            return binding.val('nowShowing') === 'widgets' ?
                Filters({binding: { default: binding, data: this.getBinding('data') }}) : null;
        },
        render: function () {
            var _ = React.DOM,
                cx = React.addons.classSet,
                binding = this.getDefaultBinding(),
                nowShowing = binding.val('nowShowing'),
                notifications = binding.sub('notifications'),
                notifications_count = notifications.val('count'),
                notifications_severity = notifications.val('severity'),
                notification_mode = notifications.sub('severity_modes').sub(notifications_severity),
                // TODO: rewrite after added severity in backend
                notifications_message = notifications_count === 0 ? notification_mode.val('message') : 'warning',
                events_class = cx({
                    'events-container': true,
                    ok: notifications_severity.toLowerCase() === 'ok' && notifications_count === 0,
                    // TODO: rewrite after added severity in backend
                    warning: notifications_severity.toLowerCase() === 'warning' || notifications_count > 0,
                    critical: notifications_severity.toLowerCase() === 'critical' || notifications_message === 'no connection'
                });

            if (notifications_count === 0 && notifications_message !== 'no connection') {
                notifications_count = '✔';
            } else if (notifications_message === 'no connection') {
                notifications_count = '✖';
            }

            return _.header({ id: 'header-region', className: 'clearfix' },
                _.div({className: 'header-sub-container top-container clearfix'},
                    _.div({className: 'company-block', title: 'Z-Wave.me'},
                        _.a({
                            className: 'company-logo',
                            href: '/',
                            title: 'Z-Wave.me',
                            alt: 'Z-Wave.me'
                        })
                    ),
                    _.nav({className: 'main-navigation'},
                        _.ul({ className: 'navigation-menu' },
                            _.li(null, _.a({ className: nowShowing === 'dashboard' || nowShowing === '' ? 'selected' : '', href: '#/dashboard' }, 'DASHBOARD')),
                            _.li(null, _.a({ className: nowShowing === 'widgets' ? 'selected' : '', href: '#/widgets' }, 'WIDGETS'))
                        )
                    ),
                    _.section({className: 'user-panel-section'},
                        _.div({ onClick: this.toggleShowNotificationsPopup, className: events_class},
                            _.span({className: 'events-counter'}, notifications_count),
                            _.span({className: 'events-message'}, notifications_message.toUpperCase())
                        ),
                        _.div({className: 'preferences-button', onClick: this.onShowPreferences},
                            _.span({className: 'icon-button small-gear tools-sprite'}),
                            _.span({className: 'label-button'}, 'PREFERENCES')
                        )
                    )
                ),
                this.isShownFilters()
            );
        }
    });
});
