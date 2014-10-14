    define([
    // libs
    'd3',
    'morearty',
    // mixins
    'mixins/sync/sync-layer'
], function (
    d3,
    Morearty,
    // mixins
    SyncLayerMixin
    ) {
    'use strict';

    return React.createClass({
        _serviceId: 'devices',
        mixins: [Morearty.Mixin, SyncLayerMixin],
        getInitialState: function () {
            var binding = this.getDefaultBinding(),
                min_level = parseInt(binding.sub('metrics').val('min')),
                max_level = parseInt(binding.sub('metrics').val('max'));

            return {
                twoPi: Math.PI * 2,
                min_level: min_level,
                max_level: max_level,
                current_level: parseInt(binding.sub('metrics').val('level')),
                step: (max_level - min_level) / 100
            }
        },
        componentWillMount: function () {
            var that = this;
            that.getDefaultBinding().sub('metrics').addListener('level', function (level, prev_level) {
                that.updateTemperature(level, prev_level);
            });
        },
        componentDidMount: function () {
            var that = this,
                color = '#40e8f0',
                radius = 20,
                border = 5,
                twoPi = this.state.twoPi,
                boxSize = '40',
                parent = d3.select(this.refs.progressContainer.getDOMNode()),
                current_level = this.state.current_level,
                arc, svg, defs, g, meter, foreground, front, numberText;

            arc = d3.svg.arc()
                .startAngle(0)
                .innerRadius(radius)
                .outerRadius(radius - border);

            svg = parent.append('svg')
                .attr('width', boxSize)
                .attr('height', boxSize);

            defs = svg.append('defs');

            g = svg.append('g')
                .attr('transform', 'translate(' + boxSize / 2 + ',' + boxSize / 2 + ')');

            meter = g.append('g')
                .attr('class', 'progress-meter');

            meter.append('path')
                .attr('class', 'background')
                .attr('fill', '#ccc')
                .attr('fill-opacity', 0.5)
                .attr('d', arc.endAngle(twoPi));

            foreground = meter.append('path')
                .attr('class', 'foreground')
                .attr('fill', color)
                .attr('fill-opacity', 1)
                .attr('stroke', color)
                .attr('stroke-width', 5)
                .attr('stroke-opacity', 1)
                .attr('filter', 'url(#blur)');

            front = meter.append('path')
                .attr('class', 'foreground')
                .attr('fill', color)
                .attr('fill-opacity', 1);

            numberText = meter.append('text')
                .attr({
                    fill: '#666',
                    'text-anchor': 'middle',
                    'font-size': '11px',
                    dy: '.40em'
                });

            this.setState({
                foreground: foreground,
                front: front,
                numberText: numberText,
                arc: arc
            }, function () {
                that.updateTemperature(current_level);
            });

        },
        updateTemperature: function (level, prev_level) {
            var that = this,
                step = this.state.step,
                _timeout;


            if (this.isMounted()) {
                if (prev_level) {
                    _timeout = function () {
                        setTimeout(function () {
                            prev_level = prev_level > level ? prev_level -= 1 : prev_level += 1;
                            that._updateCircle(prev_level, (prev_level - that.state.min_level) / step / 100);
                            if (prev_level === level) {
                                return;
                            }
                            _timeout();
                        }, 20);
                    };
                    _timeout();
                } else {
                    that._updateCircle(level, (level - that.state.min_level) / step / 100);

                }
            }
        },
        _updateCircle: function (level, percent) {
            var twoPi = this.state.twoPi,
                arc = this.state.arc;

            this.state.foreground.attr('d', arc.endAngle(twoPi * percent));
            this.state.front.attr('d', arc.endAngle(twoPi * percent));
            this.state.numberText.text(level + '°C');
        },
        render: function () {
            var that = this,
                _ = React.DOM,
                binding = this.getDefaultBinding(),
                title = binding.sub('metrics').val('title'),
                level = binding.sub('metrics').val('level');

            return (
                _.div({className: 'content'},
                    _.span({className: 'title-container'}, title),
                    _.div({
                        className: 'progress-container',
                        ref: 'progressContainer',
                        onClick: function () {
                            binding.sub('metrics').set('level', 38);
                        }
                    })
                )
            )
        }
    });
});
