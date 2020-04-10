var { DefaultMediaReceiver } = require('./DefaultMediaReceiver');

class StyledMediaReceiver extends DefaultMediaReceiver {
    constructor(client, session) {
        super(client, session);
    }
}

StyledMediaReceiver.APP_ID = '5F8DAA17';

module.exports.StyledMediaReceiver = StyledMediaReceiver;
