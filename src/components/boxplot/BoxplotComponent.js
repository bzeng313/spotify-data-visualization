import React, { useEffect, useRef, useState } from 'react';
import * as d3 from "d3";
import { nest } from 'd3-collection';
import './BoxplotComponent.css';

const COMPONENT_WIDTH = 700;
const COMPONENT_HEIGHT = 500;
const DEFAULT_FEATURE = "acousticness";

export default function BoxplotComponent({
  spotifyWebApi,
  margin = { top: 50, right: 10, bottom: 60, left: 50 },
  width = COMPONENT_WIDTH - margin.left - margin.right,
  height = COMPONENT_HEIGHT - margin.top - margin.bottom,
  countries = ["United States", "France", "Mexico", "Japan", "South Korea"],
  audioFeatures = [
    "acousticness", "danceability", "energy", "instrumentalness",
    "liveness","speechiness","valence"
  ],
}) {
  const svgRef = useRef(null);
  const [selectedFeature, setSelectedFeature] = useState(DEFAULT_FEATURE)

  // REFERENCE: https://www.d3-graph-gallery.com/graph/line_select.html used to create dropdown menu
  useEffect(() => {
    d3.select("#selectButton")
      .selectAll('myOptions')
      .data(audioFeatures)
      .enter()
      .append('option')
      .text(function (d) { return d; }) // text showed in the menu
      .attr("value", function (d) { return d; }) // corresponding value returned by the button

    d3.select("#selectButton").on("change", function (d) {
      let selected = d3.select(this).property("value")
      setSelectedFeature(selected)
    })
  }, [])

  useEffect(() => {
    d3.select(svgRef.current).select("svg").remove()

    // Append the svg object to the body of the page
    let svg = d3.select(svgRef.current)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform",
        "translate(" + margin.left + "," + margin.top + ")")

    Promise.all(countries.map((country) => {
      return getTop50Tracks(country, spotifyWebApi)
    })).then(
      (data) => {
        let flatData = data.flatMap(
          (playlists) => playlists.map((track) => ({
            feature: track[selectedFeature],
            country: track.country
          }))
        );

        drawLabels(svg, width, margin, height, selectedFeature);
        drawBoxplots(svg, flatData, width, countries, height);
      }
    ).catch((e) => {
      console.error(e);
    })
  }, [spotifyWebApi, countries, height, margin, width, selectedFeature])

  return (
    <div>
      <svg ref={svgRef} width={COMPONENT_WIDTH} height={COMPONENT_HEIGHT} />
      <select id="selectButton"></select>
    </div>
  );
}

// REFERENCE: https://observablehq.com/@stanfordvis/lets-make-a-scatterplot
function drawLabels(svg, width, margin, height, selectedFeature) {
  // Add title
  svg.append("text")
    .attr("transform", `translate(${width / 2}, ${-margin.top / 2})`)
    .style("text-anchor", "middle")
    .style("font-size", 14)
    .text("Boxplot");

  // Add X label
  svg.append("text")
    .attr("transform", `translate(${width / 2}, ${height + 35})`)
    .style("text-anchor", "middle")
    .style("font-size", 11)
    .text("Top 50 Most Played Tracks by Country");

  // Add Y axis label
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left)
    .attr("x", 0 - (height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("font-size", 11)
    .text(selectedFeature);
}

function drawBoxplots(svg, flatData, width, countries, height) {
  // Compute quartiles, median, inter quantile range min and max --> these info are then used to draw the box.
  let sumstat = nest()
    .key(function (d) { return d.country; })
    .rollup(function (d) {
      let q1 = d3.quantile(d.map(function (t) { return t.feature; }).sort(d3.ascending), .25)
      let median = d3.quantile(d.map(function (t) { return t.feature; }).sort(d3.ascending), .5)
      let q3 = d3.quantile(d.map(function (t) { return t.feature; }).sort(d3.ascending), .75)
      let interQuantileRange = q3 - q1
      let min = q1 - 1.5 * interQuantileRange
      let max = q3 + 1.5 * interQuantileRange
      return ({ q1: q1, median: median, q3: q3, interQuantileRange: interQuantileRange, min: min, max: max })
    })
    .entries(flatData)

  // Show the X scale
  var x = d3.scaleBand()
    .range([0, width])
    .domain(countries)
    .paddingInner(1)
    .paddingOuter(.5)
  svg.append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x))

  // Show the Y scale
  var y = d3.scaleLinear()
    .domain([-1.0, 2.0])
    .range([height, 0])
  svg.append("g").call(d3.axisLeft(y))

  // Show the main vertical line
  svg
    .selectAll("vertLines")
    .data(sumstat)
    .enter()
    .append("line")
    .attr("x1", function (d) { return (x(d.key)) })
    .attr("x2", function (d) { return (x(d.key)) })
    .attr("y1", function (d) { return (y(d.value.min)) })
    .attr("y2", function (d) { return (y(d.value.max)) })
    .attr("stroke", "black")
    .style("width", 40)

  // rectangle for the main box
  var boxWidth = 100
  svg
    .selectAll("boxes")
    .data(sumstat)
    .enter()
    .append("rect")
    .attr("x", function (d) { return (x(d.key) - boxWidth / 2) })
    .attr("y", function (d) { return (y(d.value.q3)) })
    .attr("height", function (d) { return (y(d.value.q1) - y(d.value.q3)) })
    .attr("width", boxWidth)
    .attr("stroke", "black")
    .style("fill", "#69b3a2")

  // Show the median
  svg
    .selectAll("medianLines")
    .data(sumstat)
    .enter()
    .append("line")
    .attr("x1", function (d) { return (x(d.key) - boxWidth / 2) })
    .attr("x2", function (d) { return (x(d.key) + boxWidth / 2) })
    .attr("y1", function (d) { return (y(d.value.median)) })
    .attr("y2", function (d) { return (y(d.value.median)) })
    .attr("stroke", "black")
    .style("width", 80)

  // Add individual points with jitter
  var jitterWidth = 50
  svg
    .selectAll("indPoints")
    .data(flatData)
    .enter()
    .append("circle")
    .attr("cx", function (d) { return (x(d.country) - jitterWidth / 2 + Math.random() * jitterWidth) })
    .attr("cy", function (d) { return (y(d.feature)) })
    .attr("r", 4)
    .style("fill", "white")
    .attr("stroke", "black")
}

async function getTop50Tracks(country, spotifyWebApi) {
  const searchResults = await spotifyWebApi.search(
    country + " Top 50", //search for all results matching top 50
    ["playlist"], //filter results to only playlists
    { limit: 1 })

  const playlistTracks = await spotifyWebApi.getPlaylistTracks(
    searchResults.playlists.items[0].id,
  );

  let trackIds = playlistTracks.items.map((item) => item.track.id);

  const audioFeatures = await spotifyWebApi.getAudioFeaturesForTracks(
    trackIds,
  );

  return audioFeatures.audio_features.map(
    (audio_feature) => {
      return {
        ...audio_feature,
        country
      }
    }
  );;
}

