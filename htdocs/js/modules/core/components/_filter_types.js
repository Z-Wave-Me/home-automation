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
                    typesBinding = state.sub('deviceTypes'),
                    types = typesBinding.val();

                return _.div({className: 'header-sub-container bottom-filter-container clearfix'},
                    types
                        .map(function (type) {
                            return _.div({
                                onClick: that.setSecondaryFilter.bind(null, type),
                                className: secondaryFilter === type ? 'secondary-filter selected' : 'secondary-filter',
                                key: type
                            }, type);
                        })
                )
            }
        });
    }
});
