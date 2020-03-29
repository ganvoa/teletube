const yts = require("yt-search");
const axios = require('axios');

const search = async query => {
    const r = await yts(query);
    return r.videos.map(video => {
        return {
            id: video.videoId,
            title: video.title,
            description: video.description,
            url: video.url,
            seconds: video.seconds,
            time: video.timestamp,
            views: video.views,
            thumbnail: video.thumbnail,
            image: video.image
        };
    });
};

const checkUrl = url => {
    return new Promise((resolve, reject) => {
        axios
            .head(url)
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

const getSong = async query => {
    let videos = await search(query);
    if (videos.length === 0) {
        throw new Error("No se encontraron resultados...");
    }
    return videos[0];
};

module.exports.search = search;
module.exports.checkUrl = checkUrl;
module.exports.getSong = getSong;
