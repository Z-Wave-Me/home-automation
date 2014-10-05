define([
    // libs
    'react',
    'morearty',
    // components
    './main_menu',
    './instances_menu',
    './modules_menu',
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
    instances_menu,
    modules_menu,
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
        components: {
            'main_menu': main_menu,
            'instances_menu': instances_menu,
            'modules_menu': modules_menu,
            '_profile': _profile,
            '_room': _room,
            '_widget': _widget,
            '_automation': _automation
        },
        getInitialState: function () {
            return {
                model: this.getItem(this.getActiveNodeTree()[0].options.serviceId)
            }
        },
        updateComponentAfterExecutionListener: function () {
            var that = this;
            if (that.isMounted()) {
                that.setState({model: that.getItem(that.getActiveNodeTree()[0].options.serviceId)});
                that.forceUpdate();
            }
        },
        componentWillMount: function () {
            var that = this;
            that.getBinding('preferences').addListener('leftPanelItemSelectedId', that.updateComponentAfterExecutionListener);
            that.getBinding('preferences').addListener('activeNodeTreeStatus', that.updateComponentAfterExecutionListener);
        },
        getComponent:function (node) {
            var that = this,
                components = this.components,
                data_binding = this.getBinding('data'),
                preferences_binding = this.getBinding('preferences'),
                component,
                item = node.options.noRequiredModel ? null : this.state.model;

            if (node.options.noRequiredModel) {
                component = components[node.options.componentName]({
                    binding: {
                        default: this.getDefaultBinding(),
                        data: data_binding,
                        preferences: preferences_binding
                    }
                });
            } else if (item && !node.options.no_required_model) {
                component = components[node.options.componentName]({
                    binding: {
                        default: this.getDefaultBinding(),
                        data: data_binding,
                        preferences: preferences_binding,
                        item: item
                    },
                    serviceId: node.options.serviceId
                });
            } else {
                component = null;
            }

            return component;
        },
        render: function () {
            var _ = React.DOM,
                binding = this.getDefaultBinding(),
                preferencesBinding = this.getBinding('preferences'),
                dataBinding = this.getBinding('data'),
                activeNode = this.getActiveNodeTree(),
                baseTitle = activeNode[0].options.name.toUpperCase();

            if (preferencesBinding.val('activeNodeTreeStatus') === 'add') {
                baseTitle += ':CREATE';
            } else if (preferencesBinding.val('activeNodeTreeStatus') === 'pending') {
                baseTitle += ':DELETE';
            }

            return _.div({ className: 'preferences-overlay clearfix' },
                // leftpanel
                activeNode[0].options.leftPanel ? _.div({className: 'left-panel-container'},
                    // search
                    activeNode[0].options.searchPanel ?
                        _base_search({
                            binding: {
                                default: preferencesBinding
                            },
                            search_attr: preferencesBinding.sub('searchStringLeftPanel')
                        })
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
                    this.getComponent(activeNode[0])
                )
            );
        }
    });
});
