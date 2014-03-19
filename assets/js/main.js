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
  xhr.open('GET', 'https://docs.google.com/spreadsheet/pub?key=0ArVHHOqS9VmBdEI1Rk4tMEhxd2pNb1ByYXNQbUJjV0E&output=csv');
  xhr.onload = function() {
    mapData = $.csv.toObjects(this.responseText);

    // put data into the map, store references to the markers and visibility in the JSON.
    for (var i = 0; i < mapData.length; i++) {
      var marker = new google.maps.Marker({
        position: new google.maps.LatLng(mapData[i].latitude, mapData[i].longitude),
        map: map,
        title: mapData[i].name
      });
      // store helpful properties
      mapData[i].marker = marker;
      mapData[i].shown = true;
      mapData[i].id = 'class' + i;

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
	  
      $('#class-list').append(template(mapData[i]));
    }
  console.log($('#class-list').size());
  console.log($('#class-list li').size());
  $('#class-list li').responsiveEqualHeightGrid();
  };
  xhr.send();

  
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
  for (var i = 0; i < mapData.length; i++) {
    var state = checkWalkin(mapData[i], filterState) &&
                checkChildcare(mapData[i], filterState) &&
                checkDateTime(mapData[i], filterState) &&
                checkSkillLevel(mapData[i], filterState)

    mapData[i].shown = state;
    mapData[i].marker.setVisible(state);
    if (!state) {
      document.getElementById(mapData[i].id).style.display = 'none';
    }
    else {
      document.getElementById(mapData[i].id).style.display = 'block';
    }
  }
}

// checkXXXXX functions return true/false if the map feature should be shown based on the internal selection logic
// checkWalkin checks the state of the open_enrollment map data, and the filterState walkin flag.
function checkWalkin(feature, filterState) {
  if (feature.open_enrollment === 'no' && filterState.walkin === true)
    return false;
  return true;
}

// checkChildcare checks the state of the childcare map data and filterState flag
function checkChildcare(feature, filterState) {
  if (feature.childcare === 'no' && filterState.childcare === true)
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
  if (feature.time.length === 0)
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

  if (filterState.datetime.m === true && feature.dateinfo.m === true)
    dayState = true;
  if (filterState.datetime.t === true && feature.dateinfo.t === true)
    dayState = true;
  if (filterState.datetime.w === true && feature.dateinfo.w === true)
    dayState = true;
  if (filterState.datetime.th === true && feature.dateinfo.th === true)
    dayState = true;
  if (filterState.datetime.f === true && feature.dateinfo.f === true)
    dayState = true;

  if (filterState.datetime.am === true && feature.dateinfo.am === true)
    timeState = true;
  if (filterState.datetime.pm === true && feature.dateinfo.pm === true)
    timeState = true;

  return dayState && timeState;
}

// checkSkillLevel checks to see if any of the skill level flags are set
function checkSkillLevel(feature, filterState) {
  // if we don't have a skill level flag set, quick return
  if (filterState.skilllevel === undefined)
    return true;

  // if we don't have skill level information, quick return
  if (feature.skill_level.length === 0 || feature.skill_level === 'unknown')
    return true;

  // if we don't have a skill level flag set, quick return
  if ((filterState.skilllevel['1'] === false || filterState.skilllevel['1'] === undefined) &&
      (filterState.skilllevel['2'] === false || filterState.skilllevel['2'] === undefined) &&
      (filterState.skilllevel['3'] === false || filterState.skilllevel['3'] === undefined))
    return true; 

  var data = feature.skill_level.toLowerCase();

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

  if (feature.dateinfo !== undefined)
    return;
  
  feature.dateinfo = [];
  feature.dateinfo.m = false;
  feature.dateinfo.t = false;
  feature.dateinfo.w = false;
  feature.dateinfo.th = false;
  feature.dateinfo.f = false;
  feature.dateinfo.am = false;
  feature.dateinfo.pm = false;
  
  // rudimentary parsing of day of week/time range info.
  // Will handle days (M W F)
  //             day ranges (M-F)
  //             and combinations (M-W F)
  // Assumes anything before 9:00 is evening, equal or after is morning. Does not handle explicit am/pm
  var datetime = feature.time.replace(/,/g, '').toLowerCase();
  var sliced = datetime.split(' ');
  for (var j = 0; j < sliced.length; j++) {
    // simple case, just the day
    if (sliced[j] === 'm') {
      feature.dateinfo.m = true;
    }
    else if (sliced[j] === 't') {
      feature.dateinfo.t = true;
    }
    else if (sliced[j] === 'w') {
      feature.dateinfo.w = true;
    }
    else if (sliced[j] === 'th') {
      feature.dateinfo.th = true;
    }
    else if (sliced[j] === 'f') {
      feature.dateinfo.f = true;
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
          feature.dateinfo.am = true;
        }
        else {
          feature.dateinfo.pm = true;
        }   
      }
      // day range
      else {
        var startIndex = days.indexOf(parts[0]);
        var endIndex = days.indexOf(parts[1]);
                
        for (; startIndex <= endIndex; startIndex++) {
          feature.dateinfo[days[startIndex]] = true;
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
