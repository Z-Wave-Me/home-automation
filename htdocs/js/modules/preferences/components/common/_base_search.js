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
        render: function () {
            var _ = React.DOM;

            return _.div({ className: 'base-search-component' },
                _.input({
                    className: 'search-input',
                    type: 'search',
                    placeholder: 'search',
                    onChange: Morearty.Callback.set(this.props.search_attr)
                })
            );
        }
    });
});
