define([
    // libs
    'react',
    'morearty',
    'alpaca',
    // components
    '../common/_buttons_group',
    '../common/_inline_input',
    // mixins
    '../../mixins/base_mixin',
    'mixins/data/data-layer'
], function (
    // libs
    React,
    Morearty,
    Alpaca,
    // components
    _buttons_group,
    _inline_input,
    // mixins
    base_mixin,
    data_layer_mixin
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin, base_mixin, data_layer_mixin],
        componentDidMount: function () {
            this.renderAlpaca(this.getBinding('preferences').val('leftPanelItemSelectedId'));
        },
        componentWillMount: function () {
            var that = this;

            that.listenerId = that.getBinding('preferences').addListener('leftPanelItemSelectedId', function (leftPanelItemSelectedId) {
                if (that.isMounted()) {
                    that.renderAlpaca(leftPanelItemSelectedId);
                    that.forceUpdate();
                }
            });
        },
        componentWillUnmount: function () {
            if (this.listenerId) {
                this.getBinding('preferences').removeListener(this.listenerId);
            }
        },
        renderAlpaca: function (instanceId) {
            var that = this, instanceJson, module, moduleJson, params, $el,
                instance = that.getModelFromCollection(instanceId, 'instances')

            if (!instance || !instanceId) {
                return;
            }

            instanceJson = instance.val().toJS();
            module = that.getModelFromCollection(instanceJson.moduleId, 'modules');
            moduleJson = module.val().toJS();
            params = Sticky.get('App.Helpers.JS').extend(instanceJson.params, {
                title: instanceJson.params.title || moduleJson.defaults.title,
                description: instanceJson.params.description || moduleJson.defaults.description
            });
            $el = $(that.refs.alpacaNodeRef.getDOMNode());

            $el.empty().alpaca({
                data: that.updateObjectAsNamespace(params),
                schema: that.updateObjectAsNamespace(moduleJson.schema),
                options: that.updateObjectAsNamespace(moduleJson.options),
                postRender: function (form) {
                    form.on("validated", function(e) {
                        var json = form.getValue();
                        instance.set('params', json);
                    });
                }
            });
        },
        onStatusModuleHandler: function (event) {
            var instanceId = this.getBinding('preferences').val('leftPanelItemSelectedId'),
                instance = this.getModelFromCollection(instanceId, 'instances');

            instance.update('params', function (params) {
                params.status = event.target.checked ? 'enable' : 'disable';
                return params;
            });

            this.forceUpdate();
            return false;
        },
        render: function () {
            var that = this,
                _ = React.DOM,
                instanceId = this.getBinding('preferences').val('leftPanelItemSelectedId'),
                data_binding = that.getBinding('data'),
                preferencesBinding = that.getBinding('preferences'),
                item_binding = this.getModelFromCollection(instanceId, 'instances'),
                add_mode = preferencesBinding.val('activeNodeTreeStatus') === 'add';

            return _.div({ className: 'model-component' },
                _.div({ className: 'form-data automation clearfix' },
                    _.div({ key: 'alpaca-container-key', className: 'form-group' },
                        _.div({ key: 'alpacaNode', id: 'alpaca-main', className: 'alpaca-main', ref: 'alpacaNodeRef'})
                    ),
                    !add_mode ? _.div({ key: 'form-default-profile-input', className: 'form-group' },
                        _.label({className: 'switch-container'},
                            _.input({
                                    className: 'ios-switch green',
                                    type: 'checkbox',
                                    checked: item_binding.val('params').status === 'enable',
                                    onChange: that.onStatusModuleHandler
                                },
                                _.div({},
                                    _.div({className: 'bubble-switch'})
                                )
                            ),
                            'On/Off'
                        )
                    ) : null,
                    _buttons_group({
                        binding: {
                            default: preferencesBinding,
                            item: item_binding,
                            items: data_binding.sub('instances')
                        },
                        serviceId: this.props.serviceId
                    })
                )
            );
        }
    });
});
