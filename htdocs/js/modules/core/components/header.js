define([
    //libs
    'react',
    'morearty',
    // components
    './filters'
], function (
    // libs
    React,
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
        isShownFilters: function () {
            return this.getDefaultBinding().val('nowShowing') === 'widgets' ?
                Filters({binding: { default: this.getDefaultBinding(), data: this.getBinding('data') }}) : null;
        },
        render: function () {
            var binding = this.getDefaultBinding(),
                nowShowing = binding.val('nowShowing'),
                notifications_count = binding.val('notificationsCount'),
                notifications_severity = binding.val('notificationsSeverity'),
                notifications_message = binding.val('notificationsMessage'),
                _ = React.DOM;

            if (notifications_count === 0 && notifications_message !== 'no connection') {
                notifications_count = '✔';
            } else if (notifications_message === 'no connection') {
                notifications_count = '✖';
            }

            return _.header({ id: 'header-region', className: 'clearfix' },
                _.div({className: 'header-sub-container top-container clearfix'},
                    _.div({className: 'company-block', title: 'Z-Wave.me'},
                        _.a({className: 'company-logo', href: '/', title: 'Z-Wave.me', alt: 'Z-Wave.me'})
                    ),
                    _.nav({className: 'main-navigation'},
                        _.ul({ className: 'navigation-menu' },
                            _.li(null, _.a({ className: nowShowing === 'dashboard' || nowShowing === '' ? 'selected' : '', href: '#/dashboard' }, 'DASHBOARD')),
                            _.li(null, _.a({ className: nowShowing === 'widgets' ? 'selected' : '', href: '#/widgets' }, 'WIDGETS'))
                        )
                    ),
                    _.section({className: 'user-panel-section'},
                        _.div({className: 'events-container ' + notifications_severity.toLowerCase()},
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
