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
        setActiveLeftPanelItemSelectedId: function (id) {
            var binding = this.getDefaultBinding();
            binding.sub('preferences').set('leftPanelItemSelectedId', id);
        },
        getModels: function () {
            var that = this,
                _ = React.DOM,
                binding = this.getDefaultBinding(),
                activeNode = this.getActiveNodeTree()[0],
                name = activeNode.options.name,
                itemsBinding,
                items,
                renderModel;

            renderModel = function (item, index) {
                var searchString = binding.sub('preferences').val('searchString').toLowerCase(),
                    leftPanelItemSelectedId = binding.sub('preferences').val('leftPanelItemSelectedId'),
                    title;

                if (name === 'rooms') {
                    title = item.toObject().title;
                } else if (name === 'general') {
                    title = item.toObject().name;
                } else if (name === 'widgets') {
                    title = item.toObject().metrics.title;
                } else if (name === 'automation') {
                    title = item.toObject().params.title;
                    console.log(item.toObject())
                }

                if ((searchString.length > 1 && searchString.indexOf(title.toLowerCase()) !== -1) || searchString.length < 2) {
                    return _.li({
                            className: leftPanelItemSelectedId === item.get('id') ? 'item-model selected' : 'item-model',
                            key: index,
                            onClick: that.setActiveLeftPanelItemSelectedId.bind(null, item.get('id'))
                        },
                        _.span({ className: 'title-item'}, title)
                    );
                } else {
                    return null;
                }

            };

            if (name === 'rooms') {
                itemsBinding = binding.sub('locations');
            } else if (name === 'general') {
                itemsBinding = binding.sub('profiles');
            } else if (name === 'widgets') {
                itemsBinding = binding.sub('devices');
            } else if (name === 'automation') {
                itemsBinding = binding.sub('instances');
            }

            items = itemsBinding.val();

            return _.ul({ className: 'left-panel-list' },
                items.map(renderModel).toArray()
            )
        },
        render: function () {
            var binding = this.getDefaultBinding(),
                preferences = binding.sub('preferences');

            return this.getModels();
        }
    });
});
