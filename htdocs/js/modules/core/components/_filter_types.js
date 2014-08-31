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
                    typesBinding = binding.sub('deviceTypes'),
                    types = typesBinding.val();

                return _.div({className: 'secondary-filters'},
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
