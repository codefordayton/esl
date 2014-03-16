// global vars (should be namespaced?)
var map;
var mapData;
var userLocation;
var filterState = [];

// sets user location
function setUserLocation(pos) {
  var myIcon = new google.maps.MarkerImage(
    'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
    null,
    null,
    null,
    new google.maps.Size(50, 50)
  );
  userLocation = new google.maps.Marker({
    position: pos,
    icon: myIcon,
    map: map,
    title: 'My Location'
  });
}

// called after the map is added, adds our data into the map and list 
function initialize() {
  // center on downtown Dayton
  var mapOptions = {
    center: new google.maps.LatLng(39.758948,-84.191607),
    zoom: 10
  };
  
  // create the map element
  map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
  
  // load the handlebars template for the class list
  var source = document.getElementById('class-template').innerHTML;
  var template = Handlebars.compile(source);
  
  // If browser supports geolocation, use it to put user location on map
  if (navigator.geolocation) {
    function success(position) {
      setUserLocation(new google.maps.LatLng(position.coords.latitude, position.coords.longitude));
    }
    navigator.geolocation.getCurrentPosition(success, null);
  }
  
  // Create the search box and link it to the UI element.
  var input = /** @type {HTMLInputElement} */(
      document.getElementById('pac-input'));
  map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

  var searchBox = new google.maps.places.SearchBox(
    /** @type {HTMLInputElement} */(input));

  // Listen for the event fired when the user selects an item from the
  // pick list. Retrieve the matching places for that item.
  google.maps.event.addListener(searchBox, 'places_changed', function() {
    var place = searchBox.getPlaces()[0];

    userLocation.setMap(null);
    setUserLocation(place.geometry.location);
  });
            
  // load the map data
  var xhr = new XMLHttpRequest();
  xhr.open('GET', location.href + 'assets/data/mapdata.geojson');
  xhr.onload = function() {
    mapData = JSON.parse(this.responseText);

    // put data into the map, store references to the markers and visibility in the JSON.
    for (var i = 0; i < mapData.features.length; i++) {
      var marker = new google.maps.Marker({
        position: new google.maps.LatLng(mapData.features[i].geometry.coordinates[1], 
                                         mapData.features[i].geometry.coordinates[0]),
        map: map,
        title: mapData.features[i].properties.name
      });
      // store helpful properties
      mapData.features[i].properties.marker = marker;
      mapData.features[i].properties.shown = true;
      mapData.features[i].properties.id = 'class' + i;

      google.maps.event.addListener(marker, 'click', function(e) {
        selectClass(mapData, e);
      });

      // TODO: Possible to simplify?
      google.maps.event.addDomListener(document.getElementById('chk-walkin'), 'click', function(e) {
        toggleWalkin(mapData, e);
      });

      google.maps.event.addDomListener(document.getElementById('chk-monday'), 'click', function(e) {
        toggleDateChange(mapData, e, 'm');
      });

      google.maps.event.addDomListener(document.getElementById('chk-tuesday'), 'click', function(e) {
        toggleDateChange(mapData, e, 't');
      });

      google.maps.event.addDomListener(document.getElementById('chk-wednesday'), 'click', function(e) {
        toggleDateChange(mapData, e, 'w');
      });

      google.maps.event.addDomListener(document.getElementById('chk-thursday'), 'click', function(e) {
        toggleDateChange(mapData, e, 'th');
      });

      google.maps.event.addDomListener(document.getElementById('chk-friday'), 'click', function(e) {
        toggleDateChange(mapData, e, 'f');
      });

      google.maps.event.addDomListener(document.getElementById('chk-morning'), 'click', function(e) {
        toggleDateChange(mapData, e, 'am');
      });

      google.maps.event.addDomListener(document.getElementById('chk-evening'), 'click', function(e) {
        toggleDateChange(mapData, e, 'pm');
      });
        
      google.maps.event.addDomListener(document.getElementById('chk-childcare'), 'click', function(e) {
        toggleChildcare(mapData, e);
      });
        
      google.maps.event.addDomListener(document.getElementById('chk-level1'), 'click', function(e) {
        toggleSkillLevel(mapData, e, '1');
      });
        
      google.maps.event.addDomListener(document.getElementById('chk-level2'), 'click', function(e) {
        toggleSkillLevel(mapData, e, '2');
      });
        
      google.maps.event.addDomListener(document.getElementById('chk-level3'), 'click', function(e) {
        toggleSkillLevel(mapData, e, '3');
      });
      document.getElementById('list-container').innerHTML += template(mapData.features[i]);
    }
  };
  xhr.send();
}

// called when a pin is clicked
function selectClass(mapData, e) {
  // loop through the class data we have and match based on coordinates
  // this logic is a bit buggy - Sinclair has two pins with the same coords; need to add additional
  // comparison logic for name.
  for (var i = 0; i < mapData.features.length; i++) {
    // if this is our pin, scroll the side window to the correct location.
    if (e.latLng.equals(mapData.features[i].properties.marker.getPosition())) {
      document.getElementById('list-container').scrollTop = 
        findPos(document.getElementById(mapData.features[i].properties.id));
      break;
    }
  }
}

// toggleXXXXX functions apply the changed checkbox to the appropriate filterState variables
function toggleWalkin(mapData, e) {
  filterState.walkin = e.currentTarget.checked;
  applyFilters(mapData, filterState);
}

function toggleDateChange(mapData, e, field) {
  if (filterState.datetime === undefined) {
    filterState.datetime = [];
  }
  filterState.datetime[field] = e.currentTarget.checked;
  applyFilters(mapData, filterState);
}

function toggleChildcare(mapData, e) {
  filterState.childcare = e.currentTarget.checked;
  applyFilters(mapData, filterState);
}

function toggleSkillLevel(mapData, e, field) {
  if (filterState.skilllevel === undefined) {
    filterState.skilllevel = [];
  }
  filterState.skilllevel[field] = e.currentTarget.checked;
  applyFilters(mapData, filterState);
}

// loop over every map point and check to see if it satisfies the current filterState
function applyFilters(mapData, filterState) {
  for (var i = 0; i < mapData.features.length; i++) {
    var state = checkWalkin(mapData.features[i], filterState) &&
                checkChildcare(mapData.features[i], filterState) &&
                checkDateTime(mapData.features[i], filterState) &&
                checkSkillLevel(mapData.features[i], filterState)

    mapData.features[i].properties.shown = state;
    mapData.features[i].properties.marker.setVisible(state);
    if (!state) {
      document.getElementById(mapData.features[i].properties.id).style.display = 'none';
    }
    else {
      document.getElementById(mapData.features[i].properties.id).style.display = 'block';
    }
  }
}

// checkXXXXX functions return true/false if the map feature should be shown based on the internal selection logic
// checkWalkin checks the state of the open_enrollment map data, and the filterState walkin flag.
function checkWalkin(feature, filterState) {
  if (feature.properties.open_enrollment === 'no' && filterState.walkin === true)
    return false;
  return true;
}

// checkChildcare checks the state of the childcare map data and filterState flag
function checkChildcare(feature, filterState) {
  if (feature.properties.childcare === 'no' && filterState.childcare === true)
    return false;
  return true;
}

// checkDateTime checks the state of the map data time (and by extension, the dateinfo structure)
//  and the filterState datetime structure. This is an 'OR'ing of the fields, i.e. if the user
//  selects Monday and Tuesday, three groups of classes will be shown:
//    1) classes with Monday in the time field
//    2) classes with Tuesday in the time field
//    3) classes without any time field data
//  Fields containing only other days will be hidden.
function checkDateTime(feature, filterState) {
  // if we don't have any datetime fields defined, quick return
  if (filterState.datetime === undefined)
    return true;

  // if we don't have any defined times, quick return
  if (feature.properties.time.length === 0)
    return true;

  var dayState = false;
  var timeState = false;
  
  // if the filters are defined, but disabled, alter the flag for that set 
  if ((filterState.datetime.m === false || filterState.datetime.m === undefined) &&
      (filterState.datetime.t === false || filterState.datetime.t === undefined) &&
      (filterState.datetime.w === false || filterState.datetime.w === undefined) &&
      (filterState.datetime.th === false || filterState.datetime.th === undefined) &&
      (filterState.datetime.f === false || filterState.datetime.f === undefined))
    dayState = true;
  if ((filterState.datetime.am === false || filterState.datetime.am === undefined) &&
      (filterState.datetime.pm === false || filterState.datetime.pm === undefined))
    timeState = true;

  // parse the time string
  parseDateTime(feature);

  if (filterState.datetime.m === true && feature.properties.dateinfo.m === true)
    dayState = true;
  if (filterState.datetime.t === true && feature.properties.dateinfo.t === true)
    dayState = true;
  if (filterState.datetime.w === true && feature.properties.dateinfo.w === true)
    dayState = true;
  if (filterState.datetime.th === true && feature.properties.dateinfo.th === true)
    dayState = true;
  if (filterState.datetime.f === true && feature.properties.dateinfo.f === true)
    dayState = true;

  if (filterState.datetime.am === true && feature.properties.dateinfo.am === true)
    timeState = true;
  if (filterState.datetime.pm === true && feature.properties.dateinfo.pm === true)
    timeState = true;

  return dayState && timeState;
}

// checkSkillLevel checks to see if any of the skill level flags are set
function checkSkillLevel(feature, filterState) {
  // if we don't have a skill level flag set, quick return
  if (filterState.skilllevel === undefined)
    return true;

  // if we don't have skill level information, quick return
  if (feature.properties.skill_level.length === 0 || feature.properties.skill_level === 'unknown')
    return true;

  // if we don't have a skill level flag set, quick return
  if ((filterState.skilllevel['1'] === false || filterState.skilllevel['1'] === undefined) &&
      (filterState.skilllevel['2'] === false || filterState.skilllevel['2'] === undefined) &&
      (filterState.skilllevel['3'] === false || filterState.skilllevel['3'] === undefined))
    return true; 

  var data = feature.properties.skill_level.toLowerCase();

  // the fields are OR'd
  if (filterState.skilllevel['1'] === true && data.indexOf('begin') === -1)
    return false;
  if (filterState.skilllevel['2'] === true && data.indexOf('inter') === -1)
    return false;
  if (filterState.skilllevel['3'] === true && data.indexOf('adv') === -1)
    return false;
  return true;
}

// parseDateTime is ugly. It handles day of week/time information in the format:
//   M, T - TH, 9:00-12:00
//   M, T, W 6:30-9:00'
//   M, W 9:00-11:30'
//   M-F, 9:00-12:00'
//   M, W, F 9:30-12:30'
//   TH 6:45-8:45
//   Data is read from the time string and stored in a dateinfo structure.
//   Limitations are detailed below.
function parseDateTime(feature) {
  var days = ['m', 't', 'w', 'th', 'f'];

  if (feature.properties.dateinfo !== undefined)
    return;
  
  feature.properties.dateinfo = [];
  feature.properties.dateinfo.m = false;
  feature.properties.dateinfo.t = false;
  feature.properties.dateinfo.w = false;
  feature.properties.dateinfo.th = false;
  feature.properties.dateinfo.f = false;
  feature.properties.dateinfo.am = false;
  feature.properties.dateinfo.pm = false;
  
  // rudimentary parsing of day of week/time range info.
  // Will handle days (M W F)
  //             day ranges (M-F)
  //             and combinations (M-W F)
  // Assumes anything before 9:00 is evening, equal or after is morning. Does not handle explicit am/pm
  var datetime = feature.properties.time.replace(/,/g, '').toLowerCase();
  var sliced = datetime.split(' ');
  for (var j = 0; j < sliced.length; j++) {
    // simple case, just the day
    if (sliced[j] === 'm') {
      feature.properties.dateinfo.m = true;
    }
    else if (sliced[j] === 't') {
      feature.properties.dateinfo.t = true;
    }
    else if (sliced[j] === 'w') {
      feature.properties.dateinfo.w = true;
    }
    else if (sliced[j] === 'th') {
      feature.properties.dateinfo.th = true;
    }
    else if (sliced[j] === 'f') {
      feature.properties.dateinfo.f = true;
    }
    // pass the buck forward, instead of M-W, data contained M - W
    else if (sliced[j] === '-') {
      sliced[j+1] = sliced[j-1] + sliced[j] + sliced[j+1];
    }
    // parsing a range, either day or time
    else if (sliced[j].indexOf('-') !== -1) {
      var parts = sliced[j].split('-');
      // if number, then it is the time
      if (isNumber(parts[0].substr(0,1))) {
        var hourMin = sliced[j].split(':');
        if (hourMin[0] >= 9) {
          feature.properties.dateinfo.am = true;
        }
        else {
          feature.properties.dateinfo.pm = true;
        }   
      }
      // day range
      else {
        var startIndex = days.indexOf(parts[0]);
        var endIndex = days.indexOf(parts[1]);
                
        for (; startIndex <= endIndex; startIndex++) {
          feature.properties.dateinfo[days[startIndex]] = true;
        }
      }
    } 
  }   
}

// isNumber is a helper function to determine if a string is numeric data. Used for parsing 
//   time strings
function isNumber (o) {
    return ! isNaN (o-0) && o !== null && o.replace(/^\s\s*/, '') !== "" && o !== false;
}        

// helper function to find the list item.
function findPos(obj) {
  var curTop = - obj.parentElement.offsetTop;
  if (obj.offsetParent) {
    do {
      curTop += obj.offsetTop;
    } while (obj = obj.offsetParent);
    return [curTop];
  }
}

// bootstraps the map element
function loadScript() {
  var script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = 'https://maps.googleapis.com/maps/api/js?libraries=places&v=3.exp&sensor=false&callback=initialize';
  document.body.appendChild(script);
}
