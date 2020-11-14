import React from 'react';
import RadarChart from './radarChart.js'
import SearchPlaylistComponent from './SearchPlaylistComponent.js'

class RadarChartComponent extends React.Component {
  constructor(props) {
    super(props);

    this.spotifyWebApi = props.spotifyWebApi;

    this.state = {
        selectedSearchPlaylistData1: null,
        selectedSearchPlaylistData2: null
    };
  }

  componentDidMount() {
      this.componentDidUpdate(); //call once so radar chart is rendered first
  }

  componentDidUpdate() {
    var margin = {top: 100, right: 100, bottom: 100, left: 100},
    width = Math.min(700, window.innerWidth - 10) - margin.left - margin.right,
    height = Math.min(width, window.innerHeight - margin.top - margin.bottom - 20);

    var data = [];
    if (this.state.selectedSearchPlaylistData1) {
        data.push(this.state.selectedSearchPlaylistData1);
    }
    if (this.state.selectedSearchPlaylistData2) {
        data.push(this.state.selectedSearchPlaylistData2);
    }
    if (data.length == 0) {
        data = [[]]
    }

    var radarChartOptions = {
        w: 500,
        h: 500,
        margin: margin,
        maxValue: 1,
        levels: 10
    };
    RadarChart("#radarChart", data, radarChartOptions);
  }

  render() {
    return (
        <div>
            <div id='radarChart'>
            </div>
            <SearchPlaylistComponent spotifyWebApi={this.spotifyWebApi} pushSelectedSearchPlaylistData={(data) => this.setState({selectedSearchPlaylistData1: data})}/>
            <SearchPlaylistComponent spotifyWebApi={this.spotifyWebApi} pushSelectedSearchPlaylistData={(data) => this.setState({selectedSearchPlaylistData2: data})}/>

        </div>
    );
  }
}

export default RadarChartComponent;

