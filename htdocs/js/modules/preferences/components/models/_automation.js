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
        renderAlpaca: function (leftPanelItemSelectedId) {
            var that = this,
                el = that.refs.alpacaNode.getDOMNode(),
                $el = $(el),
                instance = !leftPanelItemSelectedId ? that.props.model : that.getItem('instances', leftPanelItemSelectedId),
                instanceJson = instance.val().toJS(),
                module = that.getItem('modules', instanceJson.moduleId),
                moduleJson = module.val().toJS();

            var params = _.extend(instanceJson.params, {
                title: instanceJson.params.title || moduleJson.defaults.title,
                description: instanceJson.params.description || moduleJson.defaults.description,
                status: instanceJson.params.status || moduleJson.defaults.status
            });

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
        componentDidMount: function () {
            this.renderAlpaca();
        },
        componentWillMount: function () {
            var that = this;

            that.listenerId = that.getBinding('preferences').addListener('leftPanelItemSelectedId', function (leftPanelItemSelectedId) {
                that.renderAlpaca(leftPanelItemSelectedId);
                that.forceUpdate();
            });
        },
        componentWillUnmount: function () {
            if (this.listenerId) {
                this.getBinding('preferences').removeListener(this.listenerId);
            }
        },
        render: function () {
            var that = this,
                preferencesBinding = that.getBinding('preferences'),
                dataBinding = that.getBinding('data'),
                _ = React.DOM,
                item = that.props.model;

            return _.div({ className: 'model-component' },
                _.div({ className: 'form-data automation clearfix' },
                    _.div({ key: 'form-name-input', className: 'form-group' },
                        _.label({ htmlFor: 'instance-name', className: 'input-label'}, 'Name:'),
                        _.input({
                            id: 'instance-name',
                            className: 'input-value',
                            type: 'text',
                            placeholder: 'Instance name',
                            value: item.val('params').title,
                            onChange: Morearty.Callback.set(item.sub('params'), 'title')
                        })
                    ),
                    _.div({ key: 'alpaca-container-key', className: 'form-group' },
                        _.div({ key: 'alpacaNode', id: 'alpaca-main', className: 'alpaca-main', ref: 'alpacaNode'})
                    ),
                    _buttons_group({
                        binding: {
                            default: preferencesBinding,
                            item: item,
                            items: dataBinding.sub('instances')
                        },
                        model: item,
                        serviceId: this.props.serviceId
                    })
                )
            );
        }
    });
});
