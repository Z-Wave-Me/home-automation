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
                    level = item.get('metrics').level,
                    scaleTitle =
                            item.get('metrics').hasOwnProperty('scaleTitle') &&
                            item.get('metrics').scaleTitle.length > 0 ? ' ' + item.get('metrics').scaleTitle : '';

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
