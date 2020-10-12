const { exec } = require('child_process');
const chokidar = require('chokidar');

const winston = require('winston');
const format = require('string-format');
format.extend(String.prototype, {});

const { localPath, remotePath } = require('./config');

const myFormat = winston.format.printf(({ level, message, timestamp }) => {
    return '{} ({}) {}'.format(timestamp, level, message);
});

const logger = winston.createLogger({
    level: 'verbose',
    format: winston.format.combine(
        winston.format.timestamp(),
        myFormat
    ),
    transports: [
        new winston.transports.Console(),
    ]
});

logger.verbose('Initializing...');
logger.info('localPath: {}'.format(localPath));
logger.info('remotePath: {}'.format(remotePath));

// Initialize watcher.
var watcher = {};

var callback = function(filename) {
    // ignore
    if (filename.substring(0, 2) == '.~') {
        logger.verbose('ignoring change in ' + filename);
        return;
    }

    logger.info(filename + ' was modified');
    logger.verbose('Pushing changes...');
    exec('rclone -v copy "{}" "{}"'.format(localPath, remotePath), (err, stdout, stderr) => {
        if (err) {
            logger.error('ERROR: {}'.format(err));
            process.exit(1);
        }
        if (stderr) { logger.http(stderr.trim()); }
        if (stdout) { logger.http(stderr.trim()); }
        logger.verbose('Pushed changes... done!');
        logger.info('Synced');
    });
};

logger.verbose('Initializing... done!');

logger.verbose('Pulling latest changes...');
exec('rclone -v copy "{}" "{}"'.format(remotePath, localPath), (err, stdout, stderr) => {
    if (err) {
        logger.error('ERROR: {}'.format(err));
        process.exit(1);
    }
    if (stderr) { logger.http(stderr.trim()); }
    if (stdout) { logger.http(stderr.trim()); }
    logger.verbose('Pulling latest changes... done!');
    logger.info('Synced');
    logger.verbose('Starting watch...');
    watcher = chokidar.watch(localPath, {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true
    });
    watcher.on('change', callback);
    logger.verbose('Starting watch... done!');
    logger.info('Watching...');
});