

var PORT = 8080;
var DATA_PATH = "/data/global";

var GlobalDTM = require("./globalDtm");
var dtm = new GlobalDTM(DATA_PATH);

var express = require('express');
var bbox_list = require('./global-bbox.json');
var app = express();

var GetOpt = require('node-getopt');

var getopt = new GetOpt([

    ['l', 'list', 'List available DTM countries to install'],
    ['i', 'install [country]', 'Install the given country'],
    ['h', 'help', 'Show help']

]).bindHelp().parseSystem();

//console.info(getopt);
//getopt.showHelp();

/**
 *  Cmdline options. Example: "node dtm-server -h"
 */

if (getopt.options.help)
{
    getopt.showHelp();
    process.exit(0);
}

if (getopt.options.list)
{
    for (var t=0; t<bbox_list.length; t++)
        console.log(bbox_list[t].country);
    process.exit(0);
}

//FIXME: Not handling this correctly, probs need to iterate options for the correct argv or something
if (getopt.options.install)
{
    console.log("Installing '"+getopt.argv[0]+"'...");
    process.exit(0);
}

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


