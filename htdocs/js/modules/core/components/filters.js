define([
    //libs
    'react',
    'morearty',
    // components
    './_filter_rooms',
    './_filter_tags',
    './_filter_types'
], function (
    // libs
    React,
    Morearty,
    // components
    FilterRooms,
    FilterTags,
    FilterTypes
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin],
        setPrimaryFilter: function (filter) {
            this.getDefaultBinding().set('primaryFilter', filter);
            return false;
        },
        render: function () {
            var binding = this.getDefaultBinding(),
                dataBinding = this.getBinding('data'),
                _ = React.DOM,
                SecondaryFilters,
                primaryFilter = binding.val('primaryFilter');

            SecondaryFilters = function () {
                if (primaryFilter === 'rooms') {
                    return dataBinding.val('locations').toArray().length > 0 ? FilterRooms({binding: { default: binding, data: dataBinding }}) : null;
                } else if (primaryFilter === 'types') {
                    return dataBinding.val('deviceTypes').length > 0 ? FilterTypes({binding: { default: binding, data: dataBinding }}) : null;
                } else if (primaryFilter === 'tags') {
                    return dataBinding.val('deviceTags').length > 0 ? FilterTags({binding: { default: binding, data: dataBinding }}) : null;
                } else {
                    return null;
                }
            };

            return _.div({className: 'filters-container'},
                _.div({className: 'primary-filters'},
                    _.span({onClick: this.setPrimaryFilter.bind(null, 'all'), className: primaryFilter === 'all' ? 'primary-filter selected' : 'primary-filter'}, 'All'),
                    _.span({onClick: this.setPrimaryFilter.bind(null, 'rooms'), className: primaryFilter === 'rooms' ? 'primary-filter selected' : 'primary-filter'}, 'Rooms'),
                    _.span({onClick: this.setPrimaryFilter.bind(null, 'types'), className: primaryFilter === 'types' ? 'primary-filter selected' : 'primary-filter'}, 'Types'),
                    _.span({onClick: this.setPrimaryFilter.bind(null, 'tags'), className: primaryFilter === 'tags' ? 'primary-filter selected' : 'primary-filter'}, 'Tags')
                ),
                SecondaryFilters()
            )
        }
    });
});
