define([], function () {
    'use strict';

    return function (Ctx, _options) {
        var that = this,
            options = _options || {};

        return Ctx.React.createClass({
            setSecondaryFilter: function (value) {
                this.getDefaultBinding().set('secondaryFilter', value);
                return false;
            },
            render: function () {
                var that = this,
                    binding = this.getDefaultBinding(),
                    _ = Ctx.React.DOM,
                    secondaryFilter = binding.val('secondaryFilter'),
                    locationsBinding = binding.sub('locations'),
                    locations = locationsBinding.val();

                return _.div({className: 'secondary-filters'},
                    locations.map(function (item) {
                        return _.div({
                            ref: 'secondaryFilter',
                            onClick: that.setSecondaryFilter.bind(null, item.get('id')),
                            className: secondaryFilter === item.get('id') ? 'secondary-filter selected' : 'secondary-filter',
                            key: item.get('id')
                        }, item.get('title'));
                    }).toArray()
                )
            }
        });
    }
});
