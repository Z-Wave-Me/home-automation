define([], function () {
    'use strict';

    return function (Ctx, _options) {
        var that = this,
            options = _options || {};

        return Ctx.createClass({
            setSecondaryFilter: function (value) {
                this.getState().set('secondaryFilter', value);
                return false;
            },
            render: function () {
                var that = this,
                    state = this.getState(),
                    _ = Ctx.React.DOM,
                    secondaryFilter = state.val('secondaryFilter'),
                    locationsBinding = state.sub('locations'),
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
