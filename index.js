const { exec } = require('child_process');
const { Inotify } = require('inotify');

const winston = require('winston');
const format = require('string-format');
format.extend(String.prototype, {});

const { localPath, remotePath } = require('./config');

const myFormat = winston.format.printf(({ level, message, timestamp }) => {
    return '{} ({}) {}'.format(timestamp, level, message);
  });

const logger = winston.createLogger({
    level: 'info',
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

var inotify = new Inotify();

var callback = function(event) {
    // ignore
    if (event.name.substring(0, 2) == '.~') {
        logger.verbose('ignoring change in ' + event.name);
        return;
    }

    var mask = event.mask;
    var type = mask & Inotify.IN_ISDIR ? 'directory ' : 'file ';
    if (event.name) {
        type += ' ' + event.name + ' ';
    } else {
        type += ' ';
    }
    if (mask & Inotify.IN_CLOSE_WRITE) {
        logger.info(type + 'was modified');
        logger.verbose('Pushing changes...');
        exec('rclone -v copy {} {}'.format(localPath, remotePath), (err, stdout, stderr) => {
            if (err) {
                logger.error('ERROR: {}'.format(err));
                process.exit(1);
            }
            if (stderr) { logger.http(stderr.trim()); }
            if (stdout) { logger.http(stderr.trim()); }
            logger.verbose('Pushed changes... done!');
            logger.info('Synced');
        });
    }
};

var arg = {
    path: localPath,
    watch_for: Inotify.IN_CLOSE_WRITE,
    callback: callback
};

logger.verbose('Initializing... done!');

logger.verbose('Pulling latest changes...');
exec('rclone -v copy {} {}'.format(remotePath, localPath), (err, stdout, stderr) => {
    if (err) {
        logger.error('ERROR: {}'.format(err));
        process.exit(1);
    }
    if (stderr) { logger.http(stderr.trim()); }
    if (stdout) { logger.http(stderr.trim()); }
    logger.verbose('Pulling latest changes... done!');
    logger.info('Synced');
    logger.verbose('Starting watch...');
    inotify.addWatch(arg);
    logger.verbose('Starting watch... done!');
    logger.info('Watching...');
});