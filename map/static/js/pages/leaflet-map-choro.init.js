
// AJAX request should be grouped up together, and function made for counties similar to US. Number formatter needs to be updated.

var gDates={ // Chloropleth dates for app 'state'
	min_date:null,
	selected_date:null
};

var geoData={
	geojsonCounties : {}, //states that have counties active on map (by clicking the state). This list is each counties individual layer
	geojson : 0 // The layer for the all states
};

var zoomState={
	prevZoom:null,
	state:0
};

var months_list = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

var interactivemap = L.map("leaflet-map-interactive-map").setView([37.8, -96],4); // make map

var info = L.control(); // top right info on map

var legend = L.control({position: 'bottomright'});

var global_county_selected = false;

var selected_states = [];
var selected_states_full = [];

// var usStates = null; // end of file

 // Create our number formatter.
var formatter = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',

          // These options are needed to round to whole numbers if that's what you want.
          //minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
          // maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
});

var descStats = {
	mean:0,
	qs:[],
	useQs:false,
	sd:0 // used for legend of map
};

$(document).ready(function(){ // MAIN



// ---------------------------------------- MAKE CHOROPLETH MAP -------------------------------------------
// NEEDS NEW API TOKEN
	L.tileLayer( "https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw",
		{
		maxZoom: 18,
		attribution:
			'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
		id: "mapbox/light-v9",
		tileSize: 512,
		zoomOffset: -1,
		}
	).addTo(interactivemap);

// ----------------------------------------------------------------------------------------------


	getAvalDates(); 
	getAvalFeatures();
 	info.addTo(interactivemap);

	zoomState.prevZoom = interactivemap.getZoom();

}); // END MAIN



//-------------------- FUNCTIONS BELOW --------------------------------





// --------------------------------------- leaflet control (top right box)

info.onAdd = function (interactivemap) {
	this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
	this.update();
	return this._div;
};

// method that we will use to update the control based on feature properties passed
info.update = function (props) {
	price = 0; // not always price, some data is count
	if (typeof props == "object"){ // sometimes props is not object, we only want objects
		
		if ('NAME' in props){
			props.name = props.NAME;
		}else{
			//props.name='hello';
		}

		price = props.density;

		if (price<=0){ // ATTENTION - this will need to be fixed if data contains negative values
			price = "Amount Unknown"; 
		}else{
			price = formatter.format(price)
		}
	}

	feature = $('#main_select option:selected').html() 
	this._div.innerHTML = '<h4>' +  feature  + '</h4>' +  (props ? 
	'<b>' + price + '<br />' + '<h5>' +props.name + '</h5>'
	: 'Hover over a state');

	
//	this._div.innerHTML = '<h4>Median House Price</h4>' +  (props ? // ATTENTION - Median House Price needs to be dynamic to reflect selected feature
//	'<b>' + props.name + '</b><br />' + price
//	: 'Hover over a state');
};


// --------------------------------- END CONTROL ---------------------------------------------
//
// --------------------------------- Map Legend (Key) ---------------------------------------


legend.onAdd = function (interactivemap) {
	if ($("#main_select").val() != "active_listing_count"){ // ATTENTION should be if SD is needed, else quantiles
		var div = L.DomUtil.create('div', 'info legend'),
		grades = [descStats.mean-2*descStats.sd, descStats.mean-1.5*descStats.sd, descStats.mean-descStats.sd, descStats.mean, descStats.mean+descStats.sd, descStats.mean+descStats.sd*1.5, descStats.mean+2*descStats.sd],
		labels = [];

	    // loop through our density intervals and generate a label with a colored square for each interval
		for (var i = 0; i < grades.length; i++) {
			div.innerHTML +=
			    '<i style="background:' + getColor(grades[i] + 1) + '"></i> ' +
			    formatter.format(grades[i]) + (grades[i + 1] ? '&ndash;' + formatter.format(grades[i + 1]) + '<br>' : '+');
		}
		return div;
	}else{
		var div = L.DomUtil.create('div', 'info legend'),
		grades = [descStats.qs[0], descStats.qs[1], descStats.qs[2], descStats.qs[3], descStats.qs[4], descStats.qs[5],descStats.qs[6]],
		labels = [];

	    // loop through our density intervals and generate a label with a colored square for each interval
		for (var i = 0; i < grades.length; i++) {
			div.innerHTML +=
			    '<i style="background:' + getColorQ(grades[i] + 1) + '"></i> ' +
			    grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+'); // needs numeric formater
		}

		return div;
	}

};


// ----------------------------------- ZOOM EVENTS --------------------------------

interactivemap.on('zoomend',function(e){

	var currZoom = interactivemap.getZoom();

	var diff = zoomState.prevZoom - currZoom;

	if(diff > 0){
		//alert('zoomed out');
		zoomState.state +=diff;
	} else if(diff < 0) {
		zoomState.state +=diff;
		//alert('zoomed in');
	} else {
		//alert('no change');
	}

	if (zoomState.state == 0){
		global_county_selected = false;
		selected_states = [];
		selected_states_full = [];
//                      alert(geoData.geojsonCounties);
		//alert("original zoom");
		fillStates(gDates.selected_date,$("#main_select").val())

		for (var key of Object.keys(geoData.geojsonCounties)) {
			geoData.geojsonCounties[key].clearLayers();
		}
	}
	zoomState.prevZoom = currZoom;
});

// ------------------------------ END ZOOM EVENTS -----------------------------

// ------------------------------- AJAX REQUEST FOR AVAILABLE DATES ---------------
function getAvalDates(){ // ATTENTION different data mauy have different dates, this function will need to accomodate for diff data
	$.ajax({ // request for dates
	  url: page_r,
	  cache: 'false',
	  dataType: 'json',
	  type: 'POST',
		data: {file:"dates"},
	  beforeSend: function(xhr){
		  xhr.setRequestHeader('X-CSRFToken', $(csrf_r).val())
	  },
	  success: function(data) {

		  var dateTo = new Date(data.max);
		  var dateFrom = new Date(data.min);
		  var dateString = ""+(dateTo.getMonth()+1); // needs +1 because JS months start at 0
		  dateString = "0" + dateString;
		  if(dateString.includes("11") || dateString.includes("12") || dateString.includes("10") ){
			dateString = dateString.substring(1);
		  }
		  dateString = dateTo.getFullYear()+"-"+dateString;
		  gDates.selected_date = dateString;
		  fillStates(dateString); // send ajax request to fill the map
		  gDates.min_date = dateFrom;

		 months = dateTo.getMonth() - dateFrom.getMonth() + // count number of months between the monthly data
	   (12 * (dateTo.getFullYear() - dateFrom.getFullYear()));

		  $('#daterange').attr('max',months);
		  $('#daterange').attr
	  },
	  error: function(error) {}
	});
}

function getAvalFeatures(){
	$.ajax({
		url: page_r,
		cache: 'false',
		dataType: 'json',
		type: 'POST',
		data:{file:"features_list"},
	  	beforeSend: function(xhr){
		  xhr.setRequestHeader('X-CSRFToken', $(csrf_r).val())
	  },
	  success: function(data) {
		features = JSON.parse(data.features);
		features.forEach(function(f, i){
		//	alert(f);
			$('#main_select').append($('<option>', {
			    value: f,
			    text: f.replaceAll("_", " ")
			}));
		})
	  },
		error: function(error) {
		alert("error");
		}
	});
}

// ----------------------------------------- END FETCHING DATES ----------------------------------








// ------------------------------- UPDATE DATE ---------------------------------------------------
// this function is triggered when the date slider is changed. 
// It builds a date string, "mm/yyyy" and stores that date string
// then it updates the map via Ajax with "fillStates()" 

function updateDate(val){ 
	var d = new Date(gDates.min_date);
	d = addMonths(d, val);
	$('#dateLabel').html(d.getFullYear() + " " + months_list[d.getMonth()]);
	var dateString = ""+(d.getMonth()+1); // needs +1 because JS months start at 0
	dateString = "0" + dateString;
	if(dateString.includes("11") || dateString.includes("12") || dateString.includes("10") ){
                dateString = dateString.substring(1);
          } 
	dateString = d.getFullYear()+"-"+dateString;
	gDates.selected_date = dateString;

	fillStates(dateString,$("#main_select").val()) // send AJAX request to fill map with new states 
	if (global_county_selected){
		selected_states.forEach(e =>{
			getCountyAjax(e);	
		});	
	}


}


// --------------------------- END UPDATE DATE ----------------------------------------




// util function for adding n months to a date
function addMonths(date, months) {
    var d = date.getDate();
    date.setMonth(date.getMonth() + +months);
    if (date.getDate() != d) {
      date.setDate(0);
    }
    return date;
}



// fillStates
// Ajax request to fill the US map 
function fillStates(date, feature="median_listing_price"){

	$.ajax({ // request for states
	  url: page_r,
	  cache: 'false',
	  dataType: 'json',
	  type: 'POST',
		data: {file:"state", feature: feature, date:date, exclude: selected_states_full},
	  beforeSend: function(xhr){
		  xhr.setRequestHeader('X-CSRFToken', $(csrf_r).val())
	  },
	  success: function(data) {

		i = data['instances']; // instances

		descStats.mean = (i.reduce((a, b) => a + b, 0)) / i.length;

		v = [] // variance
		i.forEach(item => v.push(Math.pow(item-descStats.mean,2)));
		
		descStats.sd = Math.sqrt((v.reduce((a, b) => a + b, 0)) / v.length);

		descStats.qs = quantiles(i,7);
		
		try{ // remove previous layer, if it exists...
			geoData.geojson.clearLayers();
		}catch(err){}

		geoData.geojson = L.geoJson(data['geodata'], { style: style, onEachFeature: onEachFeature }).addTo(interactivemap); // FIX DATA

		legend.addTo(interactivemap);
	  },
	  error: function(error) {}
	});
}



// Use this function for quantiles
function quantiles(arr, quantiles){
        arr = arr.sort((a, b) => a - b); // ascending
        len = arr.length;
        num_obs = len*(1/quantiles)// number of observations per quantile
        quantile = 1;
        qs = [];
        while(quantile <= quantiles ){ // for each quantile...
                if (quantile == quantiles){ // if last quantile...
                        sl = arr.slice(quantile*num_obs-num_obs,len ); // start at normal position, end and length
                        qs.push(sl[sl.length-1]); // push last item
                }
                else{
                        sl = arr.slice(i*num_obs-num_obs, quantile*num_obs );/// start at beggening of quantle, end at end of quantile...
                        qs.push(sl[sl.length-1]); // push last item
                }
                quantile++;
        }
        return qs;

}






// ----------------------------------------- END GENERIC UTILS ------------------------------- 



function getColorQ(e){ // colors for quantiles
	if (e >= descStats.qs[6])
		 return "#084594";
	 else if (e >= descStats.qs[5])
		 return "#2171b5"; //
	 else if (e >= descStats.qs[4])
		 return"#4292c6";
	 else if (e >= descStats.qs[3])
		 return"#6baed6";
	 else if (e >= descStats.qs[2])
		 return "#9ecae1";
	 else if (e >= descStats.qs[1])
		 return "#c6dbef"; //
	 else if (e >= descStats.qs[0])
		 return "#eff3ff";
	 else
		 return"#eff3ff";
  }


 function getColor(e) { // colors for SD

		 if (e >= descStats.mean + descStats.sd*2)
			 return "#084594";
		 else if (e >= descStats.mean + 1.5*descStats.sd)
			 return "#2171b5"; //
		 else if (e >= descStats.mean + descStats.sd)
			 return"#4292c6";
		 else if (e >= descStats.mean)
			 return"#6baed6";
		 else if (e >= descStats.mean - descStats.sd)
			 return "#9ecae1";
		 else if (e >= descStats.mean - 1.5*descStats.sd)
			 return "#c6dbef"; //
		 else if (e >= descStats.mean - 2*descStats.sd)
			 return "#eff3ff";
		 else
			 return"#eff3ff";
}
function style(e) {
	t= {
		weight: 2,
		opacity: 1,
		color: "white",
		dashArray: "3",
		fillOpacity: 0.6,
		fillColor: null,
};

if (descStats.useQs)
	t.fillColor = getColorQ(e.properties.density);
else
	t.fillColor = getColor(e.properties.density);


return(t);

}



function highlightFeature(e) {
	var layer = e.target;

	layer.setStyle({
		weight: 2,
		color: '#252525',
		dashArray: '',
		fillOpacity: 0.7
	});

	if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
		layer.bringToFront();
	}
	info.update(layer.feature.properties);

}

function resetHighlight(e) {
	geoData.geojson.resetStyle(e.target);
	info.update();
}

function getCountyAjax(state_code){
	$.ajax({ // request for an individual states counties
		  url: page_r, //
		  cache: 'false',
		  dataType: 'json',
		  type: 'POST',
		data: {file:"county", state: state_code, feature:$("#main_select").val(), date:gDates.selected_date },
		  beforeSend: function(xhr){
			  xhr.setRequestHeader('X-CSRFToken', $(csrf_r).val()) // dont forget to create this variable in the template
		  },
		  success: function(data) {
			  var geojsonCounty = L.geoJson(data.features, { style: style, onEachFeature: onEachCounty }).addTo(interactivemap); // add county to map
			  if (state_code in geoData.geojsonCounties){ // if the counties are already selected
				geoData.geojsonCounties[state_code].clearLayers();
			  }
			  geoData.geojsonCounties[state_code] = geojsonCounty; // put county in object so later it can be deactivated
		  },
		error: function(){}
	});
}

function zoomToFeature(e) {

	var layer = e.target;
	
	// -------------------------- Select state code for the selected state -----------------------
	var state_code = "";
	var state_name = "";
	usStates.forEach(function(v,k){
		if (layer.feature.properties.name.toUpperCase() == v.name){
			state_code= v.abbreviation;
			state_name= v.name;
		}
	});
	// ------------------------------------------------------------------------------------------

   	interactivemap.fitBounds(e.target.getBounds()); // zoom to state... or county...

	global_county_selected = true;

	selected_states.push(state_code);
	selected_states_full.push(state_name);

	getCountyAjax(state_code);

	getChartDataAjax(selected_states.slice(-2));
}

function onEachCounty(feature, layer){
	layer.on({
		mouseover: highlightFeature,
		mouseout: resetHighlight,
		//click: 
	});

}


function onEachFeature(feature, layer) { // state
	layer.on({
		mouseover: highlightFeature,
		mouseout: resetHighlight,
		click: zoomToFeature
	});
}






// --------------- Select event ------------
$('#main_select').change(function(){
if($(this).val() == "active_listing_count"){
	descStats.useQs = true;
}else{
	descStats.useQs = false;
}
fillStates(gDates.selected_date, $(this).val());
});



var usStates = [
    { name: 'ALABAMA', abbreviation: 'AL'},
	    { name: 'ALASKA', abbreviation: 'AK'},
	    { name: 'AMERICAN SAMOA', abbreviation: 'AS'},
	    { name: 'ARIZONA', abbreviation: 'AZ'},
	    { name: 'ARKANSAS', abbreviation: 'AR'},
	    { name: 'CALIFORNIA', abbreviation: 'CA'},
	    { name: 'COLORADO', abbreviation: 'CO'},
	    { name: 'CONNECTICUT', abbreviation: 'CT'},
	    { name: 'DELAWARE', abbreviation: 'DE'},
	    { name: 'DISTRICT OF COLUMBIA', abbreviation: 'DC'},
	    { name: 'FEDERATED STATES OF MICRONESIA', abbreviation: 'FM'},
	    { name: 'FLORIDA', abbreviation: 'FL'},
	    { name: 'GEORGIA', abbreviation: 'GA'},
	    { name: 'GUAM', abbreviation: 'GU'},
	    { name: 'HAWAII', abbreviation: 'HI'},
	    { name: 'IDAHO', abbreviation: 'ID'},
	    { name: 'ILLINOIS', abbreviation: 'IL'},
	    { name: 'INDIANA', abbreviation: 'IN'},
	    { name: 'IOWA', abbreviation: 'IA'},
	    { name: 'KANSAS', abbreviation: 'KS'},
	    { name: 'KENTUCKY', abbreviation: 'KY'},
	    { name: 'LOUISIANA', abbreviation: 'LA'},
	    { name: 'MAINE', abbreviation: 'ME'},
	    { name: 'MARSHALL ISLANDS', abbreviation: 'MH'},
	    { name: 'MARYLAND', abbreviation: 'MD'},
	    { name: 'MASSACHUSETTS', abbreviation: 'MA'},
	    { name: 'MICHIGAN', abbreviation: 'MI'},
	    { name: 'MINNESOTA', abbreviation: 'MN'},
	    { name: 'MISSISSIPPI', abbreviation: 'MS'},
	    { name: 'MISSOURI', abbreviation: 'MO'},
	    { name: 'MONTANA', abbreviation: 'MT'},
	    { name: 'NEBRASKA', abbreviation: 'NE'},
	    { name: 'NEVADA', abbreviation: 'NV'},
	    { name: 'NEW HAMPSHIRE', abbreviation: 'NH'},
	    { name: 'NEW JERSEY', abbreviation: 'NJ'},
	    { name: 'NEW MEXICO', abbreviation: 'NM'},
	    { name: 'NEW YORK', abbreviation: 'NY'},
	    { name: 'NORTH CAROLINA', abbreviation: 'NC'},
	    { name: 'NORTH DAKOTA', abbreviation: 'ND'},
	    { name: 'NORTHERN MARIANA ISLANDS', abbreviation: 'MP'},
	    { name: 'OHIO', abbreviation: 'OH'},
	    { name: 'OKLAHOMA', abbreviation: 'OK'},
	    { name: 'OREGON', abbreviation: 'OR'},
	    { name: 'PALAU', abbreviation: 'PW'},
	    { name: 'PENNSYLVANIA', abbreviation: 'PA'},
	    { name: 'PUERTO RICO', abbreviation: 'PR'},
	    { name: 'RHODE ISLAND', abbreviation: 'RI'},
	    { name: 'SOUTH CAROLINA', abbreviation: 'SC'},
	    { name: 'SOUTH DAKOTA', abbreviation: 'SD'},
	    { name: 'TENNESSEE', abbreviation: 'TN'},
	    { name: 'TEXAS', abbreviation: 'TX'},
	    { name: 'UTAH', abbreviation: 'UT'},
	    { name: 'VERMONT', abbreviation: 'VT'},
	    { name: 'VIRGIN ISLANDS', abbreviation: 'VI'},
	    { name: 'VIRGINIA', abbreviation: 'VA'},
	    { name: 'WASHINGTON', abbreviation: 'WA'},
	    { name: 'WEST VIRGINIA', abbreviation: 'WV'},
	    { name: 'WISCONSIN', abbreviation: 'WI'},
	    { name: 'WYOMING', abbreviation: 'WY' }
	]


