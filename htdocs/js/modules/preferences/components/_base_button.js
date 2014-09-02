define([
    // libs
    'react',
    'morearty',
    // components
    './_base_mixin'
], function (
    // libs
    React,
    Morearty,
    // components
    _base_mixin
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin, _base_mixin],
        render: function () {
            var activeNode = this.getActiveNode(),
                _ = React.DOM;

            return _.div({ className: 'button-container-component' },
                    activeNode[0].buttons.indexOf('add') !== -1 ? _.button({ className: 'add-button' }) : null,
                    activeNode[0].buttons.indexOf('remove') !== -1 ? _.button({ className: 'remove-button' }) : null,
                    activeNode[0].buttons.indexOf('duplicate') !== -1 ? _.button({ className: 'duplicate-button' }) : null
            );
        }
    });
});
