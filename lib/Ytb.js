const { BrowserWindow, session } = require('electron');
const axios = require('axios');

getURLParameter = (url, parameter) => {
    let value = '';
    let urlparts = url.split('?');
    if (urlparts.length >= 2) {
        let pars = urlparts[1].split(/[&;]/g);
        for (let i = pars.length; i-- > 0; ) {
            if (pars[i].startsWith(parameter + '=')) {
                value = pars[i].split('=')[1];
            }
        }
    }
    return value;
};

removeURLParameters = (url, parameters) => {
    parameters.forEach(parameter => {
        var urlparts = url.split('?');
        if (urlparts.length >= 2) {
            var prefix = encodeURIComponent(parameter) + '=';
            var pars = urlparts[1].split(/[&;]/g);

            for (var i = pars.length; i-- > 0; ) {
                if (pars[i].lastIndexOf(prefix, 0) !== -1) {
                    pars.splice(i, 1);
                }
            }
            url = urlparts[0] + '?' + pars.join('&');
        }
    });
    return url;
};

checkSong = song => {
    return new Promise((resolve, reject) => {
        axios
            .head(song.audioUrl)
            .then(res => {
                if (res.status == 200) {
                    if (res.headers['content-type'] == 'text/plain') {
                        reject(new Error(`Got content-type ${res.headers['content-type']}`));
                    } else {
                        resolve();
                    }
                } else reject(new Error(`Got status ${res.status} - ${res.statusText}`));
            })
            .catch(error => {
                reject(error);
            });
    });
};

getAudioUrl = song => {
    return new Promise((resolve, reject) => {
        const downloadSession = session.fromPartition(`downloadSession${song.id}`);
        let searchWindow = new BrowserWindow({
            width: 100,
            height: 100,
            show: false,
            webPreferences: {
                session: downloadSession
            }
        });

        const timerId = setTimeout(() => {
            const error = new Error(`No se encontró la canción despues de 5 segundos`);
            reject(error);
            try {
                searchWindow.close();
            } catch (error) {}
        }, 1000 * 5);

        searchWindow.setMenu(null);
        searchWindow.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
            if (details.url.includes('youtube.com'))
                details.requestHeaders['Cookie'] = 'VISITOR_INFO1_LIVE=oKckVSqvaGw; path=/;';

            if (details.url.indexOf('mime=audio') !== -1) {
                song.audioUrl = removeURLParameters(details.url, ['range', 'rn', 'rbuf']);

                song.expiresOn = parseInt(getURLParameter(details.url, 'expire'));

                axios
                    .head(song.audioUrl)
                    .then(res => {
                        clearTimeout(timerId);

                        if (res.status == 200) {
                            if (res.headers['content-type'] == 'text/plain') {
                                reject(new Error(`Got content-type ${res.headers['content-type']}`));
                            } else {
                                resolve(song);
                            }
                        } else reject(new Error(`Got status ${res.status} - ${res.statusText}`));
                    })
                    .catch(error => {
                        clearTimeout(timerId);
                        reject(error);
                    });
                try {
                    searchWindow.close();
                } catch (error) {}
            }

            if (
                details.url.includes('doubleclick.net') ||
                details.url.includes('/ads/') ||
                details.url.includes('s0.2mdn.net') ||
                details.url.includes('files.adform.net') ||
                details.url.includes('secure-ds.serving-sys.com') ||
                details.url.includes('googlesyndication')
            )
                callback({ cancel: true });
            else
                callback({
                    cancel: false,
                    requestHeaders: details.requestHeaders
                });
        });
        searchWindow.loadURL(song.url);
    });
};

module.exports.getAudioUrl = getAudioUrl;
module.exports.checkSong = checkSong;
