class YoutubeV3 {

    defaults = {
        'cretentialsFileName': 'ytbv3.credentials.json'
    };

    /**
     * 
     * @param {JSON} clienteSecret 
     * @param {Object} options 
     * @param {string} options.cretentialsFileName 
     */
    constructor(clientSecret, options = {}) {
        this.clientSecret = clientSecret;
        this.credentialsFileName = options.cretentialsFileName || this.defaults.cretentialsFileName; 
    }



}
module.exports.YoutubeV3 = YoutubeV3;
