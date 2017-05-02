// Load API, Libraries from node_modules
const { Wit, log, interactive } = require('node-wit');
const axios = require('axios');

// This function can extract an named entity value or role from the 
// pool of entites.
// Returns entity or object.
const firstEntityValue = (entities, entity) => {
    const val = entities && entities[entity] &&
        Array.isArray(entities[entity]) &&
        entities[entity].length > 0 &&
        entities[entity][0].value;
    if (!val) {
        return null;
    }
    return typeof val === 'object' ? val.value : val;
};

// We use wit client to programmatically set the actions defined in Stories tab
// in wit.ai.
const client = new Wit({
    // access token
    accessToken: 'OWNWTZCKK7MZX4KRLUUYOUA3AY76L3HW',
    // definition of actions
    actions: {
        // This sends back to wit.ai for further understanding and progression of the story.
        send(request, response) {
            console.log(`Sending... ${JSON.stringify(response, undefined, 2)}`);
            return Promise.resolve();
        },
        // Action defined in our story.
        getForecast({ context, entities }) {

            console.log(`The current context is: ${JSON.stringify(context)}`);
            console.log(`Wit extracted ${JSON.stringify(entities)}`);

            // extract entity
            var location = firstEntityValue(entities, "location");

            // if the entity exists, do a remote weather call.
            if (location) {
                // delete the error code for missingLocation from the context.
                delete context.missingLocation;

                // url encode the location
                var encodedAddress = encodeURIComponent(location);
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
                    context.forecast = `${temperature} degrees`;

                    // return the context object
                    return Promise.resolve(context);
                }).catch((e) => {
                    // Error check for both google reverse code and forecast.io
                    if (e.code === 'ENOTFOUND') {
                        console.log('Unable to connect to API server');
                    } else {
                        console.log(e.message);
                    }
                });
            } else {
                // Location does not exist. 
                // We need to make sure so that we would go to the branch step.
                context.missingLocation = true;
                delete context.forecast;
            }

            // return the context object
            return Promise.resolve(context);
        }
    },
    //logger: new log.Logger(log.DEBUG)
});

// Start the console client
interactive(client);