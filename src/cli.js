#! /usr/bin/env node

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
    case 'h':
    case 'help':
    /* eslint-disable max-len */
      console.log('web-push-testing-service');
      console.log('');
      console.log('Usage:');
      console.log('    web-push-testing-service [options]');
      console.log('');
      console.log('Options:');
      console.log('    -h --help                     Show this screen.');
      console.log('    -p --port <Port Number>       Change port the service is run on.');
      console.log('');
      process.exit(0);
      /* eslint-enable line-length */
      break;
    case 'p':
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

logHelper.info('Starting service....');

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
