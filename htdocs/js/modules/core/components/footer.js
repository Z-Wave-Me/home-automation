define([], function () {
    'use strict';

    return function (Ctx, _options) {
        var that = this,
            options = _options || {};

        return Ctx.createClass({
            render: function () {
                var state = this.getState(),
                    _ = Ctx.React.DOM;

                return _.footer({ id: 'footer-region', className: 'clearfix' },
                    _.div({className: 'left-button-container'},
                        _.span({className: 'settings-button'}),
                        _.span({className: 'settings-label'}, 'Rearrange & Settings')
                    )
                );
            }
        });
    };
});
