const path = require('path');

module.exports = function (context, options) {
  return {
    name: 'admin-panel-plugin',
    getClientModules() {
      return [path.resolve(__dirname, '../routes')];
    },
    configureWebpack(config, isServer, utils) {
      return {
        resolve: {
          alias: {
            'admin-panel': path.resolve(__dirname, '../pages/admin-panel'),
          },
        },
      };
    },
  };
};
