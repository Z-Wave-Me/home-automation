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
    FilterRoomsClass,
    FilterTagsClass,
    FilterTypesClass
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin],
        setPrimaryFilter: function (filter) {
            var binding = this.getDefaultBinding();
            this.getDefaultBinding().set('primaryFilter', filter);
            if (filter === 'rooms') {
                binding.set('secondaryFilter', binding.sub('locations').val().get(0).get('id'));
            } else if (filter === 'tags') {
                binding.set('secondaryFilter', binding.val('deviceTags')[0]);
            } else if (filter === 'types') {
                binding.set('secondaryFilter', binding.val('deviceTypes')[0]);
            } else {
                binding.set('secondaryFilter', '');
            }
            return false;
        },
        render: function () {
            var binding = this.getDefaultBinding(),
                _ = Ctx.React.DOM,
                SecondaryFilters,
                FilterRooms = new FilterRoomsClass(Ctx),
                FilterTags = new FilterTagsClass(Ctx),
                FilterTypes = new FilterTypesClass(Ctx),
                primaryFilter = binding.val('primaryFilter');

            SecondaryFilters = function () {
                if (primaryFilter === 'rooms') {
                    return binding.val('locations').length > 0 ? FilterRooms({binding: binding}) : null;
                } else if (primaryFilter === 'types') {
                    return binding.val('deviceTypes').length > 0 ? FilterTypes({binding: binding}) : null;
                } else if (primaryFilter === 'tags') {
                    return binding.val('deviceTags').length > 0 ? FilterTags({binding: binding}) : null;
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
