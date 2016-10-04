/**
 * Copyright 2016 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
**/
'use strict';

const minimist = require('minimist');
const WPTS = require('./index.js');

const logHelper = require('./helper/log-helper.js');

const serviceValues = {};

const cliArgs = minimist(process.argv.slice(2));
const cliArgKeys = Object.keys(cliArgs);
cliArgKeys.forEach(argKey => {
  switch (argKey) {
    case '_':
      // Ignore this as it's not user input
      break;
    case 'port':
      if (typeof cliArgs[argKey] === 'number') {
        serviceValues.port = cliArgs[argKey];
      } else {
        logHelper.error(`Invalid valud for '${argKey}' argument. It must ` +
          `be a number, instead received: '${cliArgs[argKey]}'`);
        process.exit(1);
      }
      break;
    default:
      logHelper.info(`Ignoring input '${argKey}'`);
      break;
  }
});

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
});
