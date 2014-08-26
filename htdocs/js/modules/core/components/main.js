define([], function () {
    'use strict';

    return function (Ctx, _options) {
        var that = this,
            options = _options || {},
            Widgets = Sticky.get('App.Modules.Widgets');

        return Ctx.createClass({
            render: function () {
                var state = this.getState(),
                    _ = Ctx.React.DOM;

                return _.div({ className: 'main-container clearfix' },
                    _.div({id: 'main-region', className: 'main wrapper clearfix'},
                        Widgets({state: state})
                    )
                );
            }
        });
    }
});
