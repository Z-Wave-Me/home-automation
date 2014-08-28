define([], function (
    ) {
    'use strict';

    return function (Ctx) {
        return Ctx.createClass({
            render: function () {
                var _ = Ctx.React.DOM,
                    state = this.getState(),
                    item = state.val(),
                    title = item.get('metrics').title,
                    level = Sticky.get('App.Helpers.JS').isFloat(item.get('metrics').level) ? item.get('metrics').level.toFixed(1) : item.get('metrics').level,
                    scaleTitle =
                            item.get('metrics').hasOwnProperty('scaleTitle') &&
                            String(item.get('metrics').scaleTitle).length > 0 ? ' ' + String(item.get('metrics').scaleTitle) : '';

                return (
                    _.div({className: 'content'},
                        _.span({className: 'title-container'}, title),
                        _.span({className: 'value-field'},
                            _.span({className: 'probe-value'}, level + scaleTitle)
                        )
                    )
                )
            }
        });
    };
});
