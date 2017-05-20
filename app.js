//
//  Open university of Cyprus
//  Information and Communication Systems
//  Panagiotis Chalatsakos (c) 2017
//  Student Id: 11300837
//

// Import required libraries
const { Wit, log, interactive } = require('node-wit');
const axios = require('axios');

// firstEntityValue will get the entity value from the 
// pool of entities (parameters passed into the Action)
// If the entity is complex (or object) then it will return object
const firstEntityValue = (entities, entity) => {
    const val = entities && entities[entity] &&
        Array.isArray(entities[entity]) &&
        entities[entity].length > 0 &&
        entities[entity][0].value
        ;
    if (!val) {
        return null;
    }
    return typeof val === 'object' ? val.value : val;
};

// Control value for context cleanup.
var clear_context = false;

// Create a new client for Wit.Ai
// Required:
//          accessToken
//          actions array of actions.
// Optional:
//          logger object
const client = new Wit({
    accessToken: 'OWNWTZCKK7MZX4KRLUUYOUA3AY76L3HW',
    actions: {
        send(request, response) {
            console.log(JSON.stringify(response));
            return new Promise(function (resolve, reject) {
                console.log(response.text);
                return resolve();
            });
        },
        getForecast({ sessionId, context, text, entities }) {
            //console.log(`Entities are: ${JSON.stringify(entities, undefined, 2)}`);
            return new Promise((resolve, reject) => {
                if (clear_context) {
                    context = {};
                    clear_context = false;
                }

                var location = firstEntityValue(entities, 'location');
                var date = firstEntityValue(entities, 'datetime');


                if (location) {
                    context.location = location;
                } else {
                    context.missingLocation = true;
                    delete context.forecast;
                }

                if (context.location) {
                    delete context.missingLocation;
                }

                if (date) {
                    context.date = date;
                } else {
                    context.missingDate = true;
                }

                if (context.date) {
                    delete context.missingDate;
                }

                if (context.location && context.date) {
                    // url encode the location
                    var encodedAddress = encodeURIComponent(context.location);
                    var geocodeURL = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}`;

                    // first do a reverse geolocation from the location given
                    return axios.get(geocodeURL).then((response) => {
                        if (response.data.status === 'ZERO_RESULTS') {
                            throw new Error('Unable to find that address');
                        }
                        var lat = response.data.results[0].geometry.location.lat;
                        var lng = response.data.results[0].geometry.location.lng;

                        // then do a weather forecast search to forecast.io
                        var weatherURL = `https://api.darksky.net/forecast/39b78cd34c557b7ac589472a5c6a9c6b/${lat},${lng}?units=si`;
                        console.log(response.data.results[0].formatted_address);
                        return axios.get(weatherURL);
                    }).then((response) => {
                        // if the chained Promise succeeds then set the temperature to the context object
                        var temperature = response.data.currently.temperature;
                        var apparentTemperature = response.data.currently.apparentTemperature;

                        // Create the context
                        context.forecast = `${temperature} degrees`;
                        clear_context = true;
                        // return the context object
                        return resolve(context);
                    }).catch((e) => {
                        // Error check for both google reverse code and forecast.io
                        if (e.code === 'ENOTFOUND') {
                            console.log('Unable to connect to API server');
                        } else {
                            console.log(e.message);
                        }
                        delete context.forecast;
                    });
                } else {
                    delete context.forecast;
                }
                return resolve(context);
            });
        }
    },
    //logger: new log.Logger(log.DEBUG) // optional to see the POST messages
});

// Use interactive (console/terminal) mode
interactive(client);