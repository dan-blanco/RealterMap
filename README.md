# RealterMap

http://34.202.100.11:8000

## Main Files
- https://github.com/dan-blanco/RealtyMap/blob/main/map/views.py
- https://github.com/dan-blanco/RealtyMap/blob/main/map/templates/index.html 
- https://github.com/dan-blanco/RealtyMap/blob/main/map/static/js/pages/leaflet-map-choro.init.js


A few things left to add are :

1. ETL Notebook for the U.S. County GEO-Spatial data
2. The Chron-Job script that updates the database (Bulk Load)

## Technologies Used
- Django (Python)
- Mysql
- AJAX
- JQuery, Javascript

### Note
- The code could be much cleaner, the javascript should be encapsulated such as 
` myApp={  
    main:function(){  
        this.var='someVal';  
    }  
}; `
- I made this app relatively fast. Hope the code is not too overwhelming! 

