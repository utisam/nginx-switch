const {Menu} = require('electron');

const {NginxStatus} = require('./nginx');

/**
 * Actions in application
 */
class Actions {
  /**
   * @param {NginxController} nginxController
   */
  constructor(nginxController) {
    const menu = Menu.buildFromTemplate([
      {
        label: 'File',
        submenu: [
          {
            label: 'Open Template',
            accelerator: 'CmdOrCtrl+O',
          },
          {
            type: 'separator',
          },
          {
            role: 'quit',
          },
        ],
      },
      {
        label: 'Edit',
        submenu: [
          {
            id: 'edit.undo',
            role: 'undo',
          },
          {
            id: 'edit.redo',
            role: 'redo',
            enabled: false,
          },
        ],
      },
      {
        label: 'Nginx',
        submenu: [
          {
            id: 'nginx.start',
            label: 'Start',
            click: (menuItem, browserWindow, event) => {
              this.nginxController.start();
            },
          },
          {
            id: 'nginx.stop',
            label: 'Stop',
            enabled: false,
            click: (menuItem, browserWindow, event) => {
              this.nginxController.stop();
            },
          },
          {
            id: 'nginx.restart',
            label: 'Restart',
            enabled: false,
            click: (menuItem, browserWindow, event) => {
              this.nginxController.restart();
            },
          },
          {
            id: 'nginx.reload',
            label: 'Reload',
            enabled: false,
            click: (menuItem, browserWindow, event) => {
              this.nginxController.reload();
            },
          },
        ],
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'Documentation',
          },
          {
            label: 'About',
          },
        ],
      },
    ]);

    const menuItem = {
      nginxStart: menu.getMenuItemById('nginx.start'),
      nginxStop: menu.getMenuItemById('nginx.stop'),
      nginxRestart: menu.getMenuItemById('nginx.restart'),
      nginxReload: menu.getMenuItemById('nginx.reload'),
    };

    nginxController.addEventListener('change', (event) => {
      const status = event.target.status;

      if (status === NginxStatus.RUNNING) {
        menuItem.nginxStart.enabled = false;
        menuItem.nginxStop.enabled = true;
        menuItem.nginxRestart.enabled = true;
        menuItem.nginxReload.enabled = true;
      } else if (status === NginxStatus.STOPPED) {
        menuItem.nginxStart.enabled = true;
        menuItem.nginxStop.enabled = false;
        menuItem.nginxRestart.enabled = false;
        menuItem.nginxReload.enabled = false;
      } else {
        menuItem.nginxStart.enabled = false;
        menuItem.nginxStop.enabled = false;
        menuItem.nginxRestart.enabled = false;
        menuItem.nginxReload.enabled = false;
      }
    });

    this.nginxController = nginxController;
    this.menu = menu;
    this.menuItem = menuItem;
  }

  /**
   * @return {Electron.Menu}
   */
  getMenu() {
    return this.menu;
  }
}

module.exports = {
  Actions,
};
