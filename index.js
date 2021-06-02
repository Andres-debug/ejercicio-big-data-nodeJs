'use strict';

const EventEmitter = require('events');
const fs = require('fs');
const csv = require('csv-parser');
const regression = require('regression');
const ss = require('simple-statistics');
const D3Node = require('d3-node');

const inputFileName = 'anscombe.csv';
const delimiter = '\t';
const skipHeader = 3;
const columnX = String(0);
const columnY = String(1);

const d3n = new D3Node();
const d3 = d3n.d3;

var data = [];

const myEmitter = new EventEmitter();

myEmitter.on('reading-end', function () {
  const fit_data = data.map((datum) => [datum.x, datum.y]);

  const result = regression.linear(fit_data);
  const slope = result.equation[0];
  const intercept = result.equation[1];

  console.log('Slope: ' + slope.toString());
  console.log('Intercept: ' + intercept.toString());

  const x = data.map((datum) => datum.x);
  const y = data.map((datum) => datum.y);

  const r_value = ss.sampleCorrelation(x, y);

  console.log('Correlation coefficient: ' + r_value.toString());

  myEmitter.emit('analysis-end', data, slope, intercept);
});

myEmitter.on('analysis-end', function (data, slope, intercept) {
  const figDPI = 100;
  const figWidth = 7 * figDPI;
  const figHeight = (figWidth / 16) * 9;
  const margins = { top: 20, right: 20, bottom: 50, left: 50 };

  let plotWidth = figWidth - margins.left - margins.right;
  let plotHeight = figHeight - margins.top - margins.bottom;

  let minX = d3.min(data, (datum) => datum.x);
  let maxX = d3.max(data, (datum) => datum.x);
  let minY = d3.min(data, (datum) => datum.y);
  let maxY = d3.max(data, (datum) => datum.y);

  let scaleX = d3
    .scaleLinear()
    .range([0, plotWidth])
    .domain([minX - 1, maxX + 1]);
  let scaleY = d3
    .scaleLinear()
    .range([plotHeight, 0])
    .domain([minY - 1, maxY + 1]);

  const axisX = d3.axisBottom(scaleX).ticks(10);
  const axisY = d3.axisLeft(scaleY).ticks(10);

  let svg = d3n.createSVG(figWidth, figHeight);

  svg.attr('background-color', 'white');

  svg
    .append('rect')
    .attr('width', figWidth)
    .attr('height', figHeight)
    .attr('fill', 'white');

  svg
    .append('g')
    .attr('transform', `translate(${margins.left}, ${margins.top})`)
    .append('line')
    .attr('x1', scaleX(minX - 1))
    .attr('y1', scaleY((minX - 1) * slope + intercept))
    .attr('x2', scaleX(maxX + 1))
    .attr('y2', scaleY((maxX + 1) * slope + intercept))
    .attr('stroke', '#1f77b4');

  svg
    .append('g')
    .attr('transform', `translate(${margins.left}, ${margins.top})`)
    .selectAll('circle')
    .data(data)
    .enter()
    .append('circle')
    .classed('circle', true)
    .attr('cx', (d) => scaleX(d.x))
    .attr('cy', (d) => scaleY(d.y))
    .attr('r', 3)
    .attr('fill', '#ff7f0e');

  svg
    .append('g')
    .attr(
      'transform',
      `translate(${margins.left}, ${margins.top + plotHeight})`
    )
    .call(axisX);

  svg
    .append('g')
    .append('text')
    .attr(
      'transform',
      `translate(${margins.left + 0.5 * plotWidth}, ${
        margins.top + plotHeight + 0.7 * margins.bottom
      })`
    )
    .style('text-anchor', 'middle')
    .text('X');

  svg
    .append('g')
    .attr('transform', `translate(${margins.left}, ${margins.top})`)
    .call(axisY);

  svg
    .append('g')
    .attr(
      'transform',
      `translate(${0.5 * margins.left}, ${margins.top + 0.5 * plotHeight})`
    )
    .append('text')
    .attr('transform', 'rotate(-90)')
    .style('text-anchor', 'middle')
    .text('Y');

  fs.writeFileSync('fit_node.svg', d3n.svgString());

  //const canvasModule = require('canvas');
  //    let canvas = canvasModule.createCanvas(figWidth, figHeight);
  //    let context = canvas.getContext("2d");
  //
  //var DOMURL = self.URL || self.webkitURL || self;
  //
  //    let img = new Image();
  //    var svg = new Blob([svgString], {type: "image/svg+xml;charset=utf-8"});
  //    var url = DOMURL.createObjectURL(svg);
  //    img.onload = function() {
  //        ctx.drawImage(img, 0, 0);
  //        var png = canvas.toDataURL("image/png");
  //    };
});

const csvOptions = {
  separator: delimiter,
  skipLines: skipHeader,
  headers: false,
};

fs.createReadStream(inputFileName)
  .pipe(csv(csvOptions))
  .on('data', (datum) =>
    data.push({ x: Number(datum[columnX]), y: Number(datum[columnY]) })
  )
  .on('end', () => myEmitter.emit('reading-end'));
