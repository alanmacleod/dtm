

var PORT = 8080;
var DATA_PATH = "/data";

var GlobalDTM = require("./globalDtm");
var dtm = new GlobalDTM(DATA_PATH);

var express = require('express');
var app = express();


app.get('/test', function(req, res){

    console.log("Executing server test");

    var lat = 51.4826, lng = 0.007;
    var metres = dtm.GetHeight(lat, lng);
    var output = "Hello from the DTM code test. Elevation at Greenwich, London, UK ("+lat+", "+lng+") = "+metres.toFixed(3)+" metres above sea level";

    console.log(output);
    res.send(output);

});


app.listen(PORT, function(){
    console.log("DTM-SERVER listening on port " + PORT);
});


//docker run --publish-all -v /Users/alan/dev/DTM-SRTM/:/data -ti amacleod/orbnodejs:v2 /bin/bash


