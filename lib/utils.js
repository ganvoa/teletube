

const userFolder = (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE) + "/.teletube/";

/**
 * @param {Error|string} error Error to be converted
 * @returns {Error} Error object
 */
makeError = error => {
    if (typeof error == "string") return new Error(error);
    else if (typeof error == "Error") return error;
    else return error;
};

module.exports.userFolder = userFolder;
module.exports.makeError = makeError;
