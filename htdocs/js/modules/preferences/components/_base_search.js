define([
    // libs
    'react',
    'morearty'
], function (
    // libs
    React,
    Morearty
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin],
        setSearchString: function (event) {
            this.getDefaultBinding().sub('preferences').update('searchString', function () {
                return event.target.value;
            });
        },
        render: function () {
            var binding = this.getDefaultBinding(),
                _ = React.DOM;

            return _.div({ className: 'base-search-component' },
                _.input({
                    className: 'search-input',
                    type: 'search',
                    placeholder: 'search',
                    onKeyPress: Morearty.Callback.onKey(this.setSearchString)
                })
            );
        }
    });
});
