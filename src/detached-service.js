'use strict';

const logHelper = require('./helper/log-helper.js');
const WPTS = require('./index.js');

const serviceValues = JSON.parse(process.argv[2]);
const webPushTestingService = new WPTS(serviceValues.port);
webPushTestingService.startService()
.then(url => {
  const LINE = '---------------------------------' +
    '------------------------';
  logHelper.info(``);
  logHelper.info(LINE);
  logHelper.info(``);
  logHelper.info(`    Starting Service at ` +
      `${url}`);
  logHelper.info(``);
  logHelper.info(LINE);
  logHelper.info(``);

  process.send({serverStarted: true, pid: process.pid});
})
.catch(err => {
  process.send({serverStarted: false, errorMessage: err.message});
});
