define([
    //libs
    'react',
    'morearty',
    //components
    './components/base'
], function (
    //libs
    React,
    Morearty,
    // components
    BaseWidget
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin],
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
                profiles = Sticky.get('App.Modules.ServerSync').getCollection('Profiles'),
                positions = profiles && Boolean(profiles.getActive()) ? profiles.getActive().get('positions') : [];

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
