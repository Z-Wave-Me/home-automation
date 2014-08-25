define([], function (
    ) {
    'use strict';

    return function (Ctx) {
        return Ctx.createClass({
            render: function () {
                var _ = Ctx.React.DOM,
                    state = this.getState(),
                    item = state.val(),
                    styles = {
                        'background-image': '-webkit-gradient(linear, 0% 0%, 100% 0%, from(rgb(64, 232, 240)), from(rgb(190, 190, 190)))'
                    },
                    title = item.get('metrics').title,
                    level = item.get('metrics').level;

                return (
                    _.div({className: 'content'},
                        _.span({className: 'text title-container'}, title),
                        _.progress({className: 'progress-bar', value: level, min: 0, max: 100}),
                        _.input({className: 'input-range hidden', type: 'range', min: 0, max: 0, value: level, step: 1, style: styles})
                    )
                )
            }
        });
    };
});
