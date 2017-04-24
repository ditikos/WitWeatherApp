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

const client     = new Wit({
    accessToken: 'OWNWTZCKK7MZX4KRLUUYOUA3AY76L3HW',
    actions: {
        send(request, response) {
            console.log(`Sending... ${JSON.stringify(response, undefined, 2)}`);
            return Promise.resolve();
        },
        getForecast({context, entities}) {

            console.log(`The current context is: ${JSON.stringify(context)}`);
            console.log(`Wit extracted ${JSON.stringify(entities)}`);
            
            var location   = firstEntityValue(entities, "location");

            if (location) {
                delete context.missingLocation;

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
                    context.forecast = `${temperature} degrees`;
                    return Promise.resolve(context);
                }).catch((e) => {
                    if (e.code === 'ENOTFOUND') {
                        console.log('Unable to connect to API server');
                    } else {
                        console.log(e.message);
                    }
                });
            } else {
                context.missingLocation = true;
                delete context.forecast;
            }

            return Promise.resolve(context);
        }
    },
    //logger: new log.Logger(log.DEBUG)
});

interactive(client);