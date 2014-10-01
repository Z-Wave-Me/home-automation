define([
    // libs
    'react',
    'morearty',
    // components
    './main_menu',
    './models/_profile',
    './models/_room',
    './models/_widget',
    './models/_automation',
    './common/_base_button',
    './common/_base_left_panel',
    './common/_base_search',
    '../mixins/base_mixin',
    'mixins/data/data-layer'
], function (
    // libs
    React,
    Morearty,
    // components
    main_menu,
    _profile,
    _room,
    _widget,
    _automation,
    _base_button,
    _base_left_panel,
    _base_search,
    // mixins
    base_mixin,
    data_layer_mixin
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin, base_mixin, data_layer_mixin],
        getDefaultState: function() {
            return {
                model: null,
                serviceId: null
            }
        },
        componentWillMount: function () {
            var that = this;

            that.listenerId = that.getBinding('preferences').addListener('leftPanelItemSelectedId', function () {
                var nodeObject = that.getActiveNodeTree(),
                    node = Array.isArray(nodeObject) ? nodeObject[0] : null;

                if (node) {
                    that.replaceState({
                        model: that.getItem(node.options.serviceId),
                        serviceId: node.options.serviceId
                    });
                    that.forceUpdate();
                }
            });
        },
        componentWillUnmount: function () {
            if (this.listenerId) {
                this.getBinding('preferences').removeListener(this.listenerId);
            }
        },
        render: function () {
            var _ = React.DOM,
                binding = this.getDefaultBinding(),
                preferencesBinding = this.getBinding('preferences'),
                dataBinding = this.getBinding('data'),
                activeNode = this.getActiveNodeTree(),
                baseTitle = activeNode[0].options.name.toUpperCase(),
                components = {
                    'main_menu': main_menu,
                    '_profile': _profile,
                    '_room': _room,
                    '_widget': _widget,
                    '_automation': _automation
                };

            if (preferencesBinding.val('activeNodeTreeStatus') === 'adding') {
                baseTitle += ':CREATE';
            } else if (preferencesBinding.val('activeNodeTreeStatus') === 'pending') {
                baseTitle += ':DELETE';
            }

            return _.div({ className: 'preferences-overlay clearfix' },
                // leftpanel
                activeNode[0].options.leftPanel ? _.div({className: 'left-panel-container'},
                    // search
                    activeNode[0].options.searchPanel ?
                        _base_search({binding: preferencesBinding})
                        : null,
                    // list block
                    _base_left_panel({binding: { default: binding, data: dataBinding, preferences: preferencesBinding }}),
                    // buttons
                    activeNode[0].options.buttons ? _base_button({ binding: { default: preferencesBinding}}) : null
                ) : null,
                // right panel
                _.div({className: activeNode[0].options.leftPanel ? 'right-panel-container cleafix' : 'panel-container'},
                    activeNode[0].options.leftPanel ? _.h2({ className: 'title-children clearfix'}, baseTitle) : null,
                    // main component
                    preferencesBinding.val('leftPanelItemSelectedId') && this.state !== null || activeNode[0].options.name === 'main' ?
                        components[activeNode[0].options.componentName]({
                            binding: {
                                default: binding,
                                data: dataBinding,
                                preferences: preferencesBinding
                            },
                            model: this.state !== null ? this.state.model : null,
                            serviceId: this.state !== null ? this.state.serviceId : null
                        }) : null
                )
            );
        }
    });
});
