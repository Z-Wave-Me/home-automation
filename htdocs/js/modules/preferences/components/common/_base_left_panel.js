define([
    // libs
    'react',
    'morearty',
    // mixins
    '../../mixins/base_mixin'
], function (
    // libs
    React,
    Morearty,
    // mixins
    base_mixin
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin, base_mixin],
        componentDidMount: function () {
            this.refs.leftPanelList.getDOMNode().firstChild.click(); // focus on show
        },
        setActiveLeftPanelItemSelectedId: function (id) {
            this.getBinding('preferences').set('leftPanelItemSelectedId', id);
            this.setActiveNodeTreeStatus('normal');
        },
        getModels: function () {
            var that = this,
                _ = React.DOM,
                preferencesBinding = this.getBinding('preferences'),
                dataBinding = this.getBinding('data'),
                activeNode = this.getActiveNodeTree()[0],
                name = activeNode.options.name,
                itemsBinding,
                items,
                renderModel;


            renderModel = function (item, index) {
                var searchString = preferencesBinding.val('searchString').toLowerCase(),
                    leftPanelItemSelectedId = preferencesBinding.val('leftPanelItemSelectedId'),
                    statusNode = preferencesBinding.val('activeNodeTreeStatus'),
                    title;

                if (name === 'rooms') {
                    title = item.toObject().title;
                } else if (name === 'general') {
                    title = item.toObject().name;
                } else if (name === 'widgets') {
                    title = item.toObject().metrics.title;
                } else if (name === 'automation') {
                    title = item.toObject().params.title;
                }

                if ((searchString.length > 1 && searchString.indexOf(title.toLowerCase()) !== -1) || searchString.length < 2) {
                    return _.li({
                            className: leftPanelItemSelectedId === item.get('id') && statusNode !== 'adding' ? 'item-model selected' : 'item-model',
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
                itemsBinding = dataBinding.sub('locations');
            } else if (name === 'general') {
                itemsBinding = dataBinding.sub('profiles');
            } else if (name === 'widgets') {
                itemsBinding = dataBinding.sub('devices');
            } else if (name === 'automation') {
                itemsBinding = dataBinding.sub('instances');
            }

            items = itemsBinding.val();

            return _.div({className: 'left-panel-list-container'},
                _.ul({ ref: 'leftPanelList', className: 'left-panel-list' },
                    items.map(renderModel).toArray()
                )
            )
        },
        render: function () {
            return this.getModels();
        }
    });
});
