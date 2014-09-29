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
            var that = this,
                profile;

            this.getBinding('data').addListener('profiles', function () {
                if (that.profileEvent === null) {
                    profile = that.getActiveProfile();
                    if (profile) {
                        that.profileEvent = profile.addListener('positions', function () {
                            if (that.isMounted()) {
                                that.forceUpdate();
                            }
                        });
                    }

                }
            });

            that.getBinding('preferences').addListener('defaultProfileId', function () {
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
                dataBinding = this.getBinding('data'),
                primaryFilter = binding.val('primaryFilter'),
                secondaryFilter = binding.val('secondaryFilter'),
                itemsBinding = dataBinding.sub('devices'),
                items = itemsBinding.val(),
                renderWidget,
                isShown,
                isSearchMatch,
                positions = dataBinding.val('devicesOnDashboard');

            isSearchMatch = function (item) {
                var searchString = binding.val('searchString');
                return searchString.length > 0 ? item.get('metrics').title.toLowerCase().indexOf(searchString.toLowerCase()) !== -1 : true;
            };

            isShown = function (item) {
                if (binding.val('nowShowing') === 'dashboard') {
                    return positions.indexOf(item.get('id')) !== -1 ? true : null;
                } else {
                    if (primaryFilter === 'rooms') {
                        return item.get('location') === secondaryFilter;
                    } else if (primaryFilter === 'types') {
                        return item.get('deviceType') === secondaryFilter;
                    } else if (primaryFilter === 'tags') {
                        return item.get('tags').indexOf(secondaryFilter) !== -1;
                    } else {
                        return true;
                    }
                }
            };

            renderWidget = function (item, index) {
                return isShown(item) && isSearchMatch(item) ? BaseWidget({ key: index, binding: itemsBinding.sub(index) }) : null;
            };

            return __.section({id: 'devices-container', className: 'widgets'},
                items.map(renderWidget).toArray()
            );
        }
    });
});
