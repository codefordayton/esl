// global mapData (should be namespaced?)
var mapData;

// called after the map is added, adds our data into the map and list 
function initialize() {
  // center on downtown Dayton
  var mapOptions = {
    center: new google.maps.LatLng(39.758948,-84.191607),
    zoom: 10
  };
  
  // create the map element
  var map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
  
  // load the handlebars template for the class list
  var source = document.getElementById('class-template').innerHTML;
  var template = Handlebars.compile(source);
            
  // load the map data
  mapData = JSON.parse(MAP_DATA);
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
    document.getElementById('list-container').innerHTML += template(mapData.features[i]);
  }
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
  script.src = 'https://maps.googleapis.com/maps/api/js?v=3.exp&sensor=false&callback=initialize';
  document.body.appendChild(script);
}
