var { Application, MediaController } = require('../castv2-client');

class DefaultMediaReceiver extends Application {
    constructor(client, session) {
        super(client, session);
        this.media = this.createController(MediaController);
        this.media.on('status', this.onStatus.bind(this));
        this.on('close', this.onClose.bind(this));
    }
    
    onClose() {
        this.emit('disconnected');
    }
    
    onStatus(status) {
        this.emit('status', status);
    }
    
    getStatus(callback) {
        this.media.getStatus(callback);
    }

    load(media, options, callback) {
        this.media.load(media, options, callback);
    }

    play(callback) {
        this.media.play(callback);
    }

    pause(callback) {
        this.media.pause(callback);
    }

    stop(callback) {
        this.media.stop(callback);
    }

    seek(currentTime, callback) {
        this.media.seek(currentTime, callback);
    }
}

DefaultMediaReceiver.APP_ID = 'CC1AD845';

module.exports.DefaultMediaReceiver = DefaultMediaReceiver;
