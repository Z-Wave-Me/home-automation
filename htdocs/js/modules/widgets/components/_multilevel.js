define([], function (
    ) {
    'use strict';

    return function (Ctx) {
        return Ctx.createClass({
            onToggleHovering: function (hovering) {
                var state = this.getState(),
                    item = state.val();

                item.set('hovering', hovering);
                return false;
            },
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
                    _.div({className: 'content', onMouseOver: this.onToggleHovering.bind(null, true), onBlur: this.onToggleHovering.bind(null, false)},
                        _.span({className: 'text title-container'}, title),
                        _.progress({className: item.get('hovering') ? 'hidden' : 'progress-bar', value: level, min: 0, max: 100}),
                        _.input({className: item.get('hovering') ? 'input-range' : 'hidden', type: 'range', min: 0, max: 0, value: level, step: 1, style: styles})
                    )
                )
            }
        });
    };
});
