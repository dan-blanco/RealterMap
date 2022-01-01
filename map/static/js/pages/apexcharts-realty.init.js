function getChartDataAjax(states = []){
	
	$.ajax({ // request for dates
	  url: page_r,
	  cache: 'false',
	  dataType: 'json',
	  type: 'POST',
		data: {file:"chartData", level:"state", states:states},
	  beforeSend: function(xhr){
		  xhr.setRequestHeader('X-CSRFToken', $(csrf_r).val())
	  },
	  success: function(data) {
		options = {
			  chart: {
			    height: 380,
			    type: "line",
			    zoom: { enabled: !1 },
			    toolbar: { show: !1 },
			  },
			  colors: ["#556ee6", "#f46a6a", "#34c38f"],
			  dataLabels: { enabled: !1 },
			  stroke: { width: [3, 4, 3], curve: "straight", dashArray: [0, 8, 5] },
			  series: data['series'], 
				/*[
			    {
			      name: "Session Duration",
			      data: [45, 52, 38, 24, 33, 26, 21, 20, 6, 8, 15, 10],
			    },
			    {
			      name: "Page Views",
			      data: [36, 42, 60, 42, 13, 18, 29, 37, 36, 51, 32, 35],
			    },
			    {
			      name: "Total Visits",
			      data: [89, 56, 74, 98, 72, 38, 64, 46, 84, 58, 46, 49],
			    },
			  ],*/
			  title: {
			    text: $('#main_select option:selected').html(),
			    align: "left",
			    style: { fontWeight: "500" },
			  },
			  markers: { size: 0, hover: { sizeOffset: 6 } },
			  xaxis: {
				categories: data['dates'],
				 /*
			    categories: [
			      "01 Jan",
			      "02 Jan",
			      "03 Jan",
			      "04 Jan",
			      "05 Jan",
			      "06 Jan",
			      "07 Jan",
			      "08 Jan",
			      "09 Jan",
			      "10 Jan",
			      "11 Jan",
			      "12 Jan",
			    ],*/
			  },
			  tooltip: {
			    y: [
			      {
				title: {
				  formatter: function (e) {
				    return e + "";
				  },
				},
			      },
			      {
				title: {
				  formatter: function (e) {
				    return e + "";
				  },
				},
			      },
			      {
				title: {
				  formatter: function (e) {
				    return e;
				  },
				},
			      },
			    ],
			  },
			  grid: { borderColor: "#f1f1f1" },
			};
		  	$('#line_chart_dashed').html('');
			(chart = new ApexCharts(
			  document.querySelector("#line_chart_dashed"),
			  options
			)).render();
				
	  },
	  error: function(error) {}
	});

}

$(document).ready(function(){
	getChartDataAjax(["tx"]);
});

/*
options = {
  chart: {
    height: 380,
    type: "line",
    zoom: { enabled: !1 },
    toolbar: { show: !1 },
  },
  colors: ["#556ee6", "#f46a6a", "#34c38f"],
  dataLabels: { enabled: !1 },
  stroke: { width: [3, 4, 3], curve: "straight", dashArray: [0, 8, 5] },
  series: [
    {
      name: "Session Duration",
      data: [45, 52, 38, 24, 33, 26, 21, 20, 6, 8, 15, 10],
    },
    {
      name: "Page Views",
      data: [36, 42, 60, 42, 13, 18, 29, 37, 36, 51, 32, 35],
    },
    {
      name: "Total Visits",
      data: [89, 56, 74, 98, 72, 38, 64, 46, 84, 58, 46, 49],
    },
  ],
  title: {
    text: "Page Statistics",
    align: "left",
    style: { fontWeight: "500" },
  },
  markers: { size: 0, hover: { sizeOffset: 6 } },
  xaxis: {
    categories: [
      "01 Jan",
      "02 Jan",
      "03 Jan",
      "04 Jan",
      "05 Jan",
      "06 Jan",
      "07 Jan",
      "08 Jan",
      "09 Jan",
      "10 Jan",
      "11 Jan",
      "12 Jan",
    ],
  },
  tooltip: {
    y: [
      {
        title: {
          formatter: function (e) {
            return e + " (mins)";
          },
        },
      },
      {
        title: {
          formatter: function (e) {
            return e + " per session";
          },
        },
      },
      {
        title: {
          formatter: function (e) {
            return e;
          },
        },
      },
    ],
  },
  grid: { borderColor: "#f1f1f1" },
};
(chart = new ApexCharts(
  document.querySelector("#line_chart_dashed"),
  options
)).render();
*/
