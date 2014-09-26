define([
    //libs
    'morearty',
    // components
    // mixins
    'mixins/sync/sync-layer',
    'mixins/ui/popup'
], function (
    // libs
    Morearty,
    // components
    // mixins
    sync_layer_mixin,
    popup_mixin
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin, sync_layer_mixin, popup_mixin],
        getInitialState: function () {
            var binding = this.getDefaultBinding(),
                notifications = binding.sub('notifications');

            return {
                show: notifications.sub('show_popup')
            }
        },
        componentWillMount: function () {
            var that = this,
                notifications_binding = this.getDefaultBinding().sub('notifications');
            
            notifications_binding.set('searchString', '');
            notifications_binding.addListener('searchString', function () {
                that.forceUpdate();
            });
        },
        getEvent: function (notification, index) {
            var _ = React.DOM,
                binding = this.getDefaultBinding(),
                notifications = binding.sub('notifications'),
                timedate = new Date(notification.get('timestamp')),
                searchString = notifications.val('searchString') || '';

            timedate = timedate.getDate() + "/" + LZ(timedate.getMonth() + 1) + "/" + (timedate.getYear() - 100) + "-" + LZ(timedate.getHours()) + ":" + LZ(timedate.getMinutes());

            if (searchString.indexOf(notification.get('message')) === -1 && searchString.length > 2) {
                return null;
            } else {
                return _.span({className: 'event-item', id: notification.get('id'), key: 'notice-' + index },
                    _.span({className: 'time-filed'}, timedate),
                    _.span({className: 'type-filed'}, '[' + notification.get('type') + '] '),
                    _.span({className: 'message-field'}, notification.get('message')),
                    _.span({className: 'read'}, 'hide')
                );
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
                    onClick: this.hidePopup
                },
                _.div({onClick: this.stopPropagationAndPreventDefault, ref: 'popup', className: 'popover bottom popover-events'},
                    _.div({className: 'arrow'}),
                    _.div({className: 'popover-content'},
                        _.input({
                            className: 'filter-events',
                            placeholder: 'filter here',
                            onChange: Morearty.Callback.set(notifications_binding, 'searchString')
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
