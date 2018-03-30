const path = require('path');
const Docker = require('dockerode');
const log = require('electron-log');

/**
 * @enum {string}
 */
const NginxStatus = {
  STARTING: 'starting',
  RUNNING: 'running',
  STOPPING: 'stopping',
  STOPPED: 'stopped',
  RESTARTING: 'restarting',
  RELOADING: 'reloading',
};

/**
 * NginxController controls nginx container
 */
class NginxController {
  /**
   * @param {*} config
   * @param {string} confDirPath
   */
  constructor(config, confDirPath) {
    this.docker = new Docker(
      config['docker'] || {socketPath: '/var/run/docker.sock'}
    );

    this.container = {
      image: config['image'] || 'nginx:latest',
      volumes: [
        path.join(confDirPath, 'nginx.conf') + ':/etc/nginx/nginx.conf:ro',
      ].concat(config['volumes'] || []),
    };

    this.status = NginxStatus.STOPPED;
    this.containerId = null;
    /** @type {Map<string, Array<Function>>} */
    this.listenersMap = new Map([
      ['change', []],
    ]);
  }

  /**
   * @param {string} type
   * @param {Function} listener
   */
  addEventListener(type, listener) {
    const listeners = this.listenersMap.get(type);
    if (listener) {
      listeners.push(listener);
    }
  }

  /**
   * @param {Event} event
   */
  dispatchEvent(event) {
    const listeners = this.listenersMap.get(event.type);
    if (listeners) {
      for (const fn of listeners) {
        fn(event);
      }
    }
  }

  /**
   * @param {NginxStatus} status
   */
  setStatus(status) {
    this.status = status;
    log.debug(`Nginx status: ${status}`);
    this.dispatchEvent({type: 'change', target: this});
  }

  /**
   * Start container
   * @return {Promise}
   */
  start() {
    if (this.status !== NginxStatus.STOPPED) {
      return Promise.reject();
    }

    this.setStatus(NginxStatus.STARTING);

    let p;
    if (this.containerId) {
      p = Promise.resolve(this.docker.getContainer(this.containerId));
    } else {
      p = new Promise((resolve) => {
          this.docker.pull(this.container.image, (err, stream) => {
            this.docker.modem.followProgress(stream, resolve);
          });
        }).then(() => {
          return this.docker.createContainer({
            Image: this.container.image,
            HostConfig: {
              NetworkMode: 'host',
            },
          })
          .then((container) => {
            this.containerId = container.id;
            return container;
          });
        });
    }

    return p
      .then((container) => {
        return container.start();
      })
      .then((container) => {
        this.setStatus(NginxStatus.RUNNING);
      })
      .catch((err) => {
        log.error(err);
      });
  }

  /**
   * Stop container
   * @return {Promise}
   */
  stop() {
    if (this.status !== NginxStatus.RUNNING) {
      return Promise.reject();
    }

    this.setStatus(NginxStatus.STOPPING);
    return Promise.resolve(this.docker.getContainer(this.containerId))
      .then(function(container) {
        return container.stop();
      })
      .then(() => {
        this.setStatus(NginxStatus.STOPPED);
      });
  }

  /**
   * Restart container
   * @return {Promise}
   */
  restart() {
    if (this.status !== NginxStatus.RUNNING) {
      return Promise.reject();
    }

    this.setStatus(NginxStatus.RESTARTING);
    return Promise.resolve(this.docker.getContainer(this.containerId))
      .then(function(container) {
        return container.stop();
      })
      .then(function(container) {
        return container.start();
      })
      .then(() => {
        this.setStatus(NginxStatus.RUNNING);
      });
  }

  /**
   * Send signal to reload configuration
   * @return {Promise}
   */
  reload() {
    if (this.status !== NginxStatus.RUNNING) {
      return Promise.reject();
    }

    this.setStatus(NginxStatus.RELOADING);
    return Promise.resolve(this.docker.getContainer(this.containerId))
      .then(function(container) {
        container.kill({
          signal: 1, // SIGHUP
        });
      })
      .then(() => {
        this.setStatus(NginxStatus.RUNNING);
      });
  }

  /**
   * Remove container
   * @return {Promise}
   */
  clean() {
    if (!this.containerId) {
      return Promise.resolve();
    }

    log.debug('Removing nginx container');
    return Promise.resolve(this.docker.getContainer(this.containerId))
      .then((container) => {
        return container.remove({force: true});
      });
  }
}

module.exports = {
  NginxStatus,
  NginxController,
};
