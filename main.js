const {app, BrowserWindow, Menu} = require('electron');
const Config = require('electron-config');
const log = require('electron-log');
const path = require('path');
const url = require('url');

const {NginxController} = require('./lib/nginx');
const {Actions} = require('./lib/actions');

const config = new Config();

// Logger

log.transports.file.level = config.get('log.file.level');
log.transports.console.level = config.get('log.console.level');

// Nginx

const nginxController = new NginxController(config.get('nginx') || {});

// Actions

const actions = new Actions(nginxController);

// Menu

Menu.setApplicationMenu(actions.getMenu());

// App

/** @type {BrowserWindow} */
let win = null;

if (app.makeSingleInstance(function() {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
})) {
  log.error('The second instance cannot start');
  app.quit(1);
  return;
}

app.on('ready', function() {
  win = new BrowserWindow({
    width: config.get('window.width') || 800,
    height: config.get('window.height') || 600,
    x: config.get('window.x'),
    y: config.get('window.y'),
  });

  win.loadURL(url.format({
      pathname: path.join(__dirname, 'index.html'),
      protocol: 'file:',
      slashes: true,
  }));

  win.on('resize', (event) => {
    /** @type {BrowserWindow} */
    const focusedWindow = event.sender;
    let [width, height] = focusedWindow.getSize();
    config.set('window.width', width);
    config.set('window.height', height);
  });

  win.on('move', (event) => {
    /** @type {BrowserWindow} */
    const focusedWindow = event.sender;
    let [x, y] = focusedWindow.getPosition();
    config.set('window.x', x);
    config.set('window.y', y);
  });

  win.on('closed', () => {
    nginxController.clean().then(() => {
      app.quit();
    });
  });
});
