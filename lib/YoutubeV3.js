const { userFolder, makeError } = require("../lib/utils");
const express = require("express");
const { logger, tag } = require("../lib/logger");
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
const fs = require("fs");
const open = require("open");

const defaults = {
    credentialsFileName: "ytbv3.credentials.json",
    credentialsFolder: userFolder
};
const callbackUrl = "http://localhost:8888/oauth/redirect";
const scopes = ["https://www.googleapis.com/auth/youtube.readonly"];

class YoutubeV3 {
    /**
     *
     * @param {JSON} clienteSecret
     * @param {Object} options
     * @param {string} options.credentialsFileName
     * @param {string} options.credentialsFolder
     */
    constructor(appCredentials, options = {}) {
        this.appCredentials = appCredentials;
        this.credentialsFolder =
            options.userFolder || defaults.credentialsFolder;
        this.credentialsFilePath =
            this.credentialsFolder +
            (options.credentialsFileName || defaults.credentialsFileName);
    }

    createOauthClient() {
        const clientSecret = this.appCredentials.installed.client_secret;
        const clientId = this.appCredentials.installed.client_id;
        this.oauth2Client = new OAuth2(clientId, clientSecret, callbackUrl);
    }

    checkUserFolder() {
        try {
            fs.mkdirSync(this.credentialsFolder);
        } catch (err) {
            if (err.code != "EEXIST") {
                throw err;
            }
        }
    }

    saveCredentials(credentials) {
        fs.writeFileSync(this.credentialsFilePath, JSON.stringify(credentials));
    }

    openUrl(authUrl) {
        open(authUrl);
    }

    async authenticate() {

        this.checkUserFolder();
        let authUrl = this.oauth2Client.generateAuthUrl({
            access_type: "offline",
            scope: scopes
        });
        this.openUrl(authUrl);
        let token = await this.listenForCallback();
        return token;
    }

    getToken(code) {
        return new Promise((resolve, reject) => {
            this.oauth2Client.getToken(code, function(error, token) {
                if (error) {
                    reject(makeError(error));
                    return;
                }
                resolve(token);
            });
        });
    }

    listenForCallback() {
        return new Promise((resolve, reject) => {
            const app = express();
            let server = null;
            let success = false;
            app.use(express.static(__dirname + "/public"));
            app.get("/oauth/redirect", async (req, res) => {
                try {
                    const token = await this.getToken(req.query.code);
                    this.saveCredentials(token);
                    resolve(token);
                } catch (error) {
                    reject(error);
                    res.send(
                        "Ocurrió un error al obtener el token de autenticación"
                    );
                }
                success = true;
                res.send("Ya puedes volver a la aplicación");
            });
            server = app.listen(8888);
            setTimeout(() => {
                server.close();
                if (!success) {
                    logger.warn(`Didnt receive callback in 30 seconds`, tag.YOUTUBE);
                    reject(new Error(`Didnt receive callback in 30 seconds`));
                }
            }, 1000 * 30);
        })

    }
}
module.exports.YoutubeV3 = YoutubeV3;
