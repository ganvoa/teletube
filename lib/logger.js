const winston = require("winston");

const format = winston.format.combine(
    winston.format.timestamp({
        format: "YYYY-MM-DD HH:mm:ss"
    }),
    winston.format.colorize(),
    winston.format.printf(log => {
        if (log.level == "\u001b[31merror\u001b[39m")
            console.error(log.message);
        return `[ ${log.timestamp} ] ${log.level} - ${log.label} - ${log.message}`;
    })
);

winston.loggers.add("logger", {
    format: format,
    transports: [
        new winston.transports.Console({
            level: "info"
        })
    ]
});
module.exports.tag = {
    MAIN: { label: "\u001b[36mPLAYER\u001b[39m" },
    TELEGRAM: { label: "\u001b[37mTELEGRAM\u001b[39m" },
    YOUTUBE: { label: "\u001b[33mYOUTUBE\u001b[39m" },
    OAUTH: { label: "\u001b[35mOAUTH\u001b[39m" },
    CAST: { label: "\u001b[34mCHROMECAST\u001b[39m" }
};
module.exports.logger = winston.loggers.get("logger");
