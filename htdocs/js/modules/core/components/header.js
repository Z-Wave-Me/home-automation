define([
    //libs
    'backbone'
], function (
    // libs
    Backbone
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
        getClass: function (state) {
            return this.MoreartyClass({state: state});
        },
        _createClass: function () {
            var that = this;

            that.MoreartyClass = that.Ctx.createClass({
                onShowPreferences: function () {
                    //this.getState().atomically()
                    //    .set('overlayShow', true)
                     //   .set('overlayShowName', 'preferences')
                     //   .commit();
                    this.getState().set('overlayShow', true);
                    console.log(this.getState().val('overlayShow'));
                    return false;
                },
                render: function () {
                    window.state = this.getState();
                    var state = this.getState(),
                        nowShowing = state.val('nowShowing'),
                        notifications_count = state.val('notificationsCount'),
                        notifications_severity = state.val('notificationsSeverity'),
                        notifications_message = state.val('notificationsMessage'),
                        _ = that.Ctx.React.DOM;

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
                        _.div({className: 'header-sub-container main-filter-container clearfix'}),
                        _.div({className: 'header-sub-container bottom-filter-container clearfix'})
                    );
                }
            });
        }
    });
});
