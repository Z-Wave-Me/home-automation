define([
    // libs
    'react',
    'morearty',
    // mixins
    './_base_mixin'
], function (
    // libs
    React,
    Morearty,
    _base_mixin
    // mixins
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin, _base_mixin],
        render: function () {
            var that = this,
                binding = this.getDefaultBinding(),
                activeNode = this.getActiveNodeTree()[0],
                _ = React.DOM;

            return _.div({ className: 'base-children-component clearfix' },
                _.div({ className: 'children-container' },
                    activeNode.children.map(function (childNode, index) {
                        return _.span({
                            className: childNode.id === activeNode.id ? 'child-node selected' : 'child-node',
                            key: index,
                            onClick: that.setActiveNode.bind(null, childNode.id)
                        }, childNode.options.name.toUpperCase());
                    })
                )
            );
        }
    });
});

