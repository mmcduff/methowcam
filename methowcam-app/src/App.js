import React from 'react';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';

import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

import { Slider, Icon, Tooltip } from 'antd';
import 'antd/dist/antd.css';

import $ from 'jquery';
import _ from 'lodash';

import moment from 'moment';

var history = window.history;

var cache = {};

function bisect_left(a , x) {
    var lo = 0;
    var hi = a.length;
    while ( lo < hi ) {
        const mid = ( lo + hi ) / 2 | 0 ;
        if ( x > a[mid] ) lo = mid + 1 ;
        else hi = mid ;
    }
    return lo ;
}

class App extends React.Component {
  constructor(props) {
    super(props);

    var camera = "south";
    var date = moment().startOf('day');
    var selected = null;
    if (history.state) {
      if (history.state.camera) camera = history.state.camera;
      if (history.state.date) date = history.state.date;
      if (history.state.selected) selected = history.state.selected;
    }
    var url = new URL(window.location.href);
    if (url.searchParams.get("camera")) camera = url.searchParams.get("camera");
    if (url.searchParams.get("date")) date = moment(url.searchParams.get("date")).startOf('day');
    if (url.searchParams.get("selected")) selected = parseInt(url.searchParams.get("selected"));

    window.addEventListener("popstate", this.onPopState.bind(this));
    window.document.addEventListener("keypress", this.onKeyPress.bind(this));
      
    this.state = {date: date, camera: camera, images: new Map(), selected: selected};
    this.iter = 0;
    this.fetchData(date, camera);
  }

  maxDate() {
    return moment().startOf('day').toDate();
  }

  onPopState(event) {
    if (history.state) {
      this.setState({
        date: moment(history.state.date),
        camera: history.state.camera,
        selected: history.state.selected,
      });
    }
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (prevState.camera !== this.state.camera ||
        prevState.date !== this.state.date) {
      this.fetchData(this.state.date, this.state.camera);
    }

    var url = new URL(window.location.href);
    url.searchParams.set("camera", this.state.camera);
    url.searchParams.set("date", this.state.date.format('YYYY-MM-DD'));
    url.searchParams.set("selected", this.state.selected);
    if (url.href !== window.location.href) {
      this.iter += 1;
      var iter = this.iter;
      window.setTimeout((function () {
        if (iter !== this.iter) {
          return;
        }
        history.pushState(
          {
            camera: this.state.camera,
            date: this.state.date.valueOf(),
            selected: this.state.selected,
          },
          "",
          url.href,
        );
      }).bind(this), 500);
    }
  }

  onKeyPress(e) {
    var date;
    if (!this.state.images) return;
    var index = bisect_left(this.state.images.ticks, this.state.selected);
    if (e.code === 'KeyJ' && index > 0) {
      this.setState({selected: this.state.images.ticks[index - 1]})
    } else if (e.code === 'KeyK' && index < this.state.images.ticks.length - 1) {
      if (this.state.images.ticks[index] !== this.state.selected) {
        index -= 1;
      }
      this.setState({selected: this.state.images.ticks[index + 1]})
    } else if (e.code === 'KeyH') {
      date = this.state.date.clone();
      date.subtract(1, 'day');
      this.setState({date: date})
    } else if (e.code === 'KeyL' && this.state.date < moment().startOf('day')) {
      date = this.state.date.clone();
      date.add(1, 'day');
      this.setState({date: date})
    }
  }
  

  handleDateChange(date) {
    date = moment(date).startOf('day');
    if (date !== this.state.date) {
      this.setState({date: date, images: new Map()});
    }
  }

  handleCameraChange(e) {
    var cam = e.target.value;
    if (cam !== this.state.camera) {
      this.setState({camera: cam, images: new Map()});
    }
  }

  onSliderChange(value) {
    this.setState({selected:value});
  }

  fetchData(date, cam) {
    var callback = (function (json) {
      if (date === this.state.date && cam === this.state.camera) {
        var images = new Map();
        var selected = this.state.selected;
        images.ticks = []
        for (let [image, url] of json) {
          var ts = image.slice(image.indexOf('/') + 1);
          var t = moment(ts, "YYYY-MM-DD-HH-mm");
          var minutes = t.diff(this.state.date, 'minutes');
          images.set(minutes, [t.format("h:mma"), url])
          if (this.state.selected !== null && Math.abs(minutes - this.state.selected) < 5) {
            selected = minutes;
          }
          images.ticks.push(minutes);
        }
        if (selected === null && images.ticks) {
          selected = images.ticks[images.ticks.length - 1];
        }
        this.setState({images: images, selected: selected});
      }
    }).bind(this);
    var ds = date.format('YYYY-MM-DD');
    var url = `https://api.methowcam.mmcduff.com/v1/get_images?camera=${cam}&date=${ds}`;
    if (cache.hasOwnProperty(url)) {
      callback(cache[url]);
    } else {
      $.getJSON(url, {}, function (json) {
        cache[url] = json;
        callback(json);
      });
    }
  }

  sliderFormatter(value) {
    if (this.state.images.has(value)) {
      return this.state.images.get(value)[0];
    }
    return 'x';
  }
  
  render() {
    var marks = {};
    for (var tick of this.state.images.keys()) {
      marks[tick] = "";
      if (tick === this.state.selected) {
        marks[tick] = this.state.images.get(tick)[0];
      }
    }
    var image = null;
    if (this.state.images.has(this.state.selected)) {
      var img_url = this.state.images.get(this.state.selected)[1];
      image = <img src={img_url} alt={this.state.camera} className="container-fluid"/>;
    }
    var hidden_images = [];
    if (this.state.images.ticks) {
      var index_s = this.state.images.ticks.indexOf(this.state.selected);
      for (let index of _.range(index_s - 5, index_s + 5)) {
        if (this.state.images.ticks && this.state.images.ticks.hasOwnProperty(index)) {
          var load_url = this.state.images.get(this.state.images.ticks[index])[1];
          hidden_images.push(<img className="d-none" src={load_url} alt="" key={load_url} />);
        }
      }
    }
    var tooltip = <div>
      Use J/K to change time <br/>
      Use H/L to change date
    </div>;
    return (
      <div className="App">
        <div className="container-fluid pt-2">
          <div className="row">
            <div className="col-md-2" style={{display: 'flex'}}>
              <div className="my-0 mx-2">
                <Tooltip title={tooltip}>
                  <Icon type="info-circle" />
                </Tooltip>
              </div>
              <div className="w-50 m-0">
                <DatePicker
                  selected={this.state.date.toDate()}
                  onChange={this.handleDateChange.bind(this)}
                  className="form-control-sm w-100"
                  maxDate={moment().startOf('day').toDate()}
                />
              </div>
              <select
                className="form-control-sm w-50 m-0"
                onChange={this.handleCameraChange.bind(this)}
                value={this.state.camera}
                >
                <option>south</option>
                <option>west</option>
                <option>westhd</option>
                <option>shed</option>
              </select>
            </div>
            <div className="col-md-10">
              <Slider
                min={0}
                max={60*24}
                marks={marks}
                step={null}
                tipFormatter={this.sliderFormatter.bind(this)}
                onChange={this.onSliderChange.bind(this)}
                value={this.state.selected}
              />
            </div>
          </div>
          {image}
          {hidden_images}
        </div>
      </div>
    );
  }
}

export default App;
