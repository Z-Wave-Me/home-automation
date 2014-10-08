define([
    // libs

    'morearty'
], function (
    // libs
    Morearty
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin],
        componentWillMount: function () {
            var that = this;
            that.getBinding('data').addListener('deviceTypes', function () {
                if (that.isMounted()) {
                    that.forceUpdate();
                }
            });
        },
        componentDidMount: function () {
            var binding = this.getDefaultBinding(),
                dataBinding = this.getBinding('data');

            if (dataBinding.val('deviceTypes').length > 0) {
                binding.set('secondaryFilter', dataBinding.val('deviceTypes').first());
            }
        },
        setSecondaryFilter: function (value) {
            this.getDefaultBinding().set('secondaryFilter', value);
            return false;
        },
        render: function () {
            var that = this,
                binding = this.getDefaultBinding(),
                dataBinding = this.getBinding('data'),
                _ = React.DOM,
                secondaryFilter = binding.val('secondaryFilter'),
                typesBinding = dataBinding.sub('deviceTypes'),
                types = typesBinding.val().toJS();

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
});
