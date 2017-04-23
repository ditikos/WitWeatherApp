const {wit, log} = require('node-wit');
const client     = new wit({
    accessToken: MY_TOKEN,
    actions: {
        send(request, response) {
            return new Promise(function(resolve, reject) {
                console.log(JSON.stringify(response, undefined, 2));
                return resolve();
            });
        },
        myAction({sessionId, context, text, entities}) {
            console.log(`Session ${sessionId} received ${text}`);
            console.log(`The current context is: ${JSON.stringify(context)}`);
            console.log(`Wit extracted ${JSON.stringify(entities)}`);
            return Promise.resolve(context);
        }
    },
    logger: new log.Logger(log.DEBUG)
});