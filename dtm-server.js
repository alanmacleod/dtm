

var PORT = 8080;
//var DATA_PATH = "/data";   // <--- PUBLISH
var DATA_PATH = "/Users/alan/dev/DTM-SRTM/global2";     // <--- DEV

var M_TO_F = 3.28084;

var GlobalDTM = require("./globalDtm");
var dtm = new GlobalDTM(DATA_PATH);

var express = require('express');
var bbox_list = require('./global-bbox.json');
var app = express();

var GetOpt = require('node-getopt');
var Installer = require('./install');

var installer = new Installer(DATA_PATH);

var SILENT_MODE = false;

var getopt = new GetOpt([

    ['l', 'list', 'List available DTM countries to install'],
    ['i', 'install [country]', 'Install the given country'],
    ['o', 'overwrite', 'Overwrite any files during installation'],
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
    installer.printOptions();
    process.exit(0);
}



//FIXME: Not handling this correctly, probs need to iterate options for the correct argv or something
if (getopt.options.install)
{
    SILENT_MODE = true; // supress server notification to stdout
    var overwrite = false;

    if (getopt.options.overwrite) overwrite = true;

    installer.install(getopt.argv[0], overwrite, function(error){
        if (error) {
            console.log(error);
        }else {
            console.log("Finished.");
        }

        process.exit(0); // could just leave the process running here, server is ready to receive requests...
    });
}

if (getopt.options.overwrite && !getopt.options.install)
{
    console.log("Overwrite option ignored (no installation requested)");
}


app.get('/test', function(req, res){

    console.log("Executing server test");

    var lat = 51.4826, lng = 0.007;
    var metres = dtm.GetHeight(lat, lng);
    var output = "Hello from the DTM code test. Elevation at Greenwich, London, UK ("+lat+", "+lng+") = "+metres.toFixed(3)+" metres above sea level";

    console.log(output);
    res.send(output);

});

//TODO: Error handling/checking
app.get("/:lat/:lng", function(req, res) {

    var metres = dtm.GetHeight(Number(req.params.lat), Number(req.params.lng));
    res.send({
        metres: metres,
        feet: metres * M_TO_F
    });

});


//TODO: Add a 'batch' method to accept an array of latlng pairs and return their elevation


app.listen(PORT, function(){
    if (!SILENT_MODE) console.log("DTM-SERVER listening on port " + PORT);
});


//docker run -p 8080:8080 -v /Users/alan/dev/DTM-SRTM/:/data -ti amacleod/orbdtm /bin/bash
//docker run -p 8080:8080 -v /Users/alan/dev/DTM-SRTM/:/data -t amacleod/orbdtm node /var/dtm-server/dtm-server -i unitedkingdom
// docker run -t amacleod/orbdtm node /var/dtm-server/dtm-server --help