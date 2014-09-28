define([
    //libs
    'morearty',
    // components
    // mixins
    'mixins/sync/sync-layer'
], function (
    // libs
    Morearty,
    // components
    // mixins
    sync_layer_mixin
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin, sync_layer_mixin],
        setFullViewItem: function (id) {
            if (this.isMounted()) {
                this.getBinding('notifications_options').set('full_view_notice_id', id);
                this.forceUpdate();
            }
        },
        hideNotice: function () {
            var that = this,
                model = this.getBinding('notifications').sub(this.getBinding('index'));

            model.set('redeemed', true);

            that.save({
                serviceId: 'notifications',
                model: model,
                collection: this.getBinding('notifications'),
                success: function (obj) {
                    if (obj.val('redeemed')) {
                        that.setFullViewItem(null);
                        that.getBinding('data').sub('notifications').delete(that.getBinding('index'));
                    }
                }
            });
            return false;
        },
        componentWillMount: function () {
            var that = this;
            this.getBinding('notifications_options').addListener('full_view_notice_id', function () {
                if (that.isMounted()) {
                    that.forceUpdate();
                }
            })
        },
        render: function () {
            var _ = React.DOM,
                notification = this.getBinding('notification'),
                index = this.getBinding('index'),
                full_view = this.getBinding('notifications_options').val('full_view_notice_id') === notification.val('id'),
                time_date = new Date(notification.val('timestamp'));

            time_date = time_date.getDate() + "/" + LZ(time_date.getMonth() + 1) + "/" + (time_date.getYear() - 100) + "-" + LZ(time_date.getHours()) + ":" + LZ(time_date.getMinutes());

            if (full_view) {
                return (
                    _.div({className: 'event-item full-view', id: notification.val('id'), key: 'notice-' + index },
                        _.span({className: 'content-container'},
                            _.div({key: 'type-value', className: 'type-value'}, 'Type: ' + notification.val('type')),
                            _.div({key: 'time-value', className: 'time-value'}, 'Timestamp: ' + time_date),
                            _.label({key: 'message-label',className: 'label'}, 'Message:'),
                            _.div({key: 'message-value', className: 'message-value'}, notification.val('message'))
                        ),
                        _.span({className: 'actions-container'},
                            _.span({
                                className: 'action-button',
                                onClick: this.hideNotice
                            }, 'HIDE'),
                            _.span({
                                onClick: this.setFullViewItem.bind(null, null),
                                className: 'action-button'
                            }, 'MINIMIZE')
                        )
                    )
                );
            } else {
                return (
                    _.div({onClick: this.setFullViewItem.bind(null, notification.val('id')), className: 'event-item', id: notification.val('id'), key: 'notice-' + index },
                        _.span({className: 'content-container'},
                            _.span({className: 'type-filed'}, '[' + notification.val('type').toUpperCase() + '] '),
                            _.span({className: 'message-field'}, notification.val('message'))
                        ),
                        _.span({
                            className: 'action'
                        })
                    )
                );
            }
        }
    });
});
