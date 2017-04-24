const {Wit, log, interactive} = require('node-wit');
const axios                   = require('axios');

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

var getWeather = function(location) {
    var encodedAddress = encodeURIComponent(location);
    var geocodeURL     = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}`;

    return axios.get(geocodeURL).then((response) => {
        if (response.data.status === 'ZERO_RESULTS') {
            throw new Error('Unable to find that address');
        }
        var lat = response.data.results[0].geometry.location.lat;
        var lng = response.data.results[0].geometry.location.lng;
        var weatherURL     = `https://api.darksky.net/forecast/39b78cd34c557b7ac589472a5c6a9c6b/${lat},${lng}?units=si`;
        console.log(response.data.results[0].formatted_address);
        return axios.get(weatherURL);
    }).then((response) => {
        var temperature         = response.data.currently.temperature;
        var apparentTemperature = response.data.currently.apparentTemperature;
        return {
            temperature: temperature,
            apparentTemperature: apparentTemperature
        };
    }).catch((e) => {
        if (e.code === 'ENOTFOUND') {
            console.log('Unable to connect to API server');
        } else {
            console.log(e.message);
        }
    });
};


const client     = new Wit({
    accessToken: 'OWNWTZCKK7MZX4KRLUUYOUA3AY76L3HW',
    actions: {
        send(request, response) {
            return new Promise(function(resolve, reject) {
                console.log(JSON.stringify(response, undefined, 2));
                return resolve();
            });
        },
        getForecast({sessionId, context, text, entities}) {
            console.log(`Session ${sessionId} received ${text}`);
            console.log(`The current context is: ${JSON.stringify(context)}`);
            console.log(`Wit extracted ${JSON.stringify(entities)}`);
            //return Promise.resolve(context);
            let when       = firstEntityValue(entities, "when");
            let location   = firstEntityValue(entities, "location");

            // if (location) {
            //     context.location = location;
            //     delete context.missingLocation;
            // } else {
            //     context.missingLocation = true;
            //     delete context.forecast;
            //     delete context.location;
            // }
            // return context;

            if (location) {
                return new Promise((resolve, reject) => {
                    return getWeather(location).then(weatherJSON => {
                        context.forecast = weatherJSON.temperature;
                        delete context.missingLocation;
                        return resolve(context);
                    })
                });
            } else {
                context.missingLocation = true;
                delete context.forecast;
                return Promise.reject(context);
            }
            return context;
        }
    },
    //logger: new log.Logger(log.DEBUG)
});

interactive(client);