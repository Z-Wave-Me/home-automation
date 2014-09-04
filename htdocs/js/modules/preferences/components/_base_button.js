define([
    // libs
    'react',
    'morearty',
    // components
    './../mixins/base_mixin'
], function (
    // libs
    React,
    Morearty,
    // components
    base_mixin
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin, base_mixin],
        render: function () {
            var activeNode = this.getActiveNodeTree(),
                _ = React.DOM;

            return _.div({ className: 'button-container-component' },
                activeNode[0].options.buttons.indexOf('add') !== -1 ? _.button({ className: 'button-element add-button', onClick: this.setActiveNodeTreeStatus.bind(null, 'adding') }, '+') : null,
                activeNode[0].options.buttons.indexOf('remove') !== -1 ? _.button({ className: 'button-element remove-button', onClick: this.setActiveNodeTreeStatus.bind(null, 'removing') }, '-') : null,
                activeNode[0].options.buttons.indexOf('duplicate') !== -1 ? _.button({ className: 'button-element duplicate-button', onClick: this.setActiveNodeTreeStatus.bind(null, 'duplicating') }, 'd') : null
            );
        }
    });
});
