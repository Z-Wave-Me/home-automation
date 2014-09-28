define([
    //libs
    'morearty',
    // components
    './components/event',
    // mixins
    'mixins/sync/sync-layer',
    'mixins/ui/popup'
], function (
    // libs
    Morearty,
    // components
    Event,
    // mixins
    sync_layer_mixin,
    popup_mixin
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin, sync_layer_mixin, popup_mixin],
        hideNotificationsPopup: function () { // rewrite method
            this.state.show.set(false);
            return false;
        },
        getInitialState: function () {
            return {
                show: this.getDefaultBinding().sub('notifications').sub('show_popup')
            }
        },
        componentWillMount: function () {
            var that = this,
                notifications_binding = this.getDefaultBinding().sub('notifications');
            
            notifications_binding.set('searchString', '');
            notifications_binding.set('full_view_notice_id', null);
            notifications_binding.addListener('searchString', function () {
                if (that.isMounted()) {
                    that.forceUpdate();
                }
            });
            this.getBinding('data').addListener('notifications', function () {
                if (that.isMounted()) {
                    that.forceUpdate();
                }
            });
        },
        getEvent: function (notification, index) {
            var notifications_options = this.getDefaultBinding().sub('notifications'),
                search_string = notifications_options.val('searchString') || '';

            if (notification.get('redeemed') || (notification.get('message').toLowerCase().indexOf(search_string.toLowerCase()) === -1 && search_string.length > 2)) {
                return null;
            } else {
                return (
                    Event({
                        binding: {
                            notification: this.getBinding('data').sub('notifications').sub(index),
                            index: index,
                            notifications: this.getBinding('data').sub('notifications'),
                            notifications_options: notifications_options
                        }
                    })
                )
            }
        },
        componentDidMount: function () {
            var popup = this.refs.popup.getDOMNode(),
                events_button = document.querySelector('.events-counter'),
                events_button_position = events_button.getBoundingClientRect();

            popup.style.top = events_button_position.top + events_button.height + 'px';
            popup.style.left = events_button_position.left - popup.offsetWidth / 2 + events_button.offsetWidth / 2 + 'px';
        },
        render: function () {
            var _ = React.DOM,
                binding = this.getDefaultBinding(),
                notifications_binding = this.getBinding('data').sub('notifications'),
                notifications = notifications_binding.val();

            return _.div({
                    className: 'overlay transparent show',
                    onClick: this.hideNotificationsPopup
                },
                _.div({onClick: this.stopPropagationAndPreventDefault, ref: 'popup', className: 'popover bottom popover-events'},
                    _.div({className: 'arrow'}),
                    _.div({className: 'popover-content'},
                        _.input({
                            className: 'filter-events',
                            placeholder: 'filter here',
                            onChange: Morearty.Callback.set(binding.sub('notifications'), 'searchString')
                        }),
                        _.div({className: 'events-container'},
                            notifications.map(this.getEvent).toArray()
                        ),
                        _.div({className: 'button-container'},
                            _.button({className: 'button hide-all-button'}, 'HIDE ALL'),
                            _.button({className: 'button hide-all-visible-button'}, 'HIDE ALL VISIBLE')
                        )
                    )
                )
            );
        }
    });
});
