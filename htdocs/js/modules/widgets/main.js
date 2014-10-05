define([
    //libs
    'react',
    'morearty',
    // components
    './components/base',
    // mixins
    'mixins/data/data-layer'
], function (
    //libs
    React,
    Morearty,
    // components
    BaseWidget,
    // mixins
    data_layer_mixin
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin, data_layer_mixin],
        profileEvent: null,
        componentWillMount: function () {
            var that = this;

            that.getBinding('data').addListener('devicesOnDashboard', function () {
                if (that.isMounted()) {
                    that.forceUpdate();
                }
            });

            that.getBinding('data').addListener('devices', function () {
                if (that.isMounted()) {
                    that.forceUpdate();
                }
            });

            that.getBinding('preferences').addListener('defaultProfileId', function () {
                if (that.isMounted()) {
                    that.forceUpdate();
                }
            });

            that.getDefaultBinding().addListener('primaryFilter', function () {
                if (that.isMounted()) {
                    that.forceUpdate();
                }
            });

            that.getDefaultBinding().addListener('secondaryFilter', function () {
                if (that.isMounted()) {
                    that.forceUpdate();
                }
            });
        },
        componentWillUnmount: function () {
            if (this.profileEvent) {
                this.getActiveProfile().removeListener(this.profileEvent);
            }
        },
        render: function () {
            var __ = React.DOM,
                binding = this.getDefaultBinding(),
                data_binding = this.getBinding('data'),
                primary_filter = binding.val('primaryFilter'),
                secondary_filter = binding.val('secondaryFilter'),
                items_binding = data_binding.sub('devices'),
                positions = data_binding.val('devicesOnDashboard'),
                isShown, isSearchMatch;

            isSearchMatch = function (item) {
                var search_string = binding.val('searchStringMainPanel'),
                    title = item.get('metrics').get('title');

                return search_string.length > 0 ? title.toLowerCase().indexOf(search_string.toLowerCase()) !== -1 : true;
            };

            isShown = function (item) {
                if (!item.get('permanently_hidden')) {
                    if (binding.val('nowShowing') === 'dashboard') {
                        return positions.indexOf(item.get('id')) !== -1 ? true : null;
                    } else {
                        if (primary_filter === 'rooms') {
                            return item.get('location') === secondary_filter;
                        } else if (primary_filter === 'types') {
                            return item.get('deviceType') === secondary_filter;
                        } else if (primary_filter === 'tags') {
                            return item.get('tags').toJS().indexOf(secondary_filter) !== -1;
                        } else {
                            return true;
                        }
                    }
                } else {
                    return false;
                }

            };

            return __.section({id: 'devices-container', className: 'widgets'},
                items_binding.val().map(function (item, index) {
                    return isShown(item) && isSearchMatch(item) ? BaseWidget({ key: index, binding: { default: items_binding.sub(index)} }) : null;
                }).toArray()
            );
        }
    });
});
