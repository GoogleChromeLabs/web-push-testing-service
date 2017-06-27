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

const storage = require('node-persist');
const path = require('path');
const minimist = require('minimist');
const execSync = require('child_process').execSync;
const spawn = require('child_process').spawn;

const logHelper = require('../helper/log-helper.js');


class WPTSCLI {
  constructor() {
    storage.initSync();

    this._debugMode = false;

    logHelper.setLogFile('./cli.log');
  }

  argv(argv) {
    const cliArgs = minimist(argv);
    if (cliArgs._.length > 0) {
      // We have a command
      this.handleCommand(cliArgs._[0], cliArgs._.splice(1), cliArgs);
    } else {
      // we have a flag only request
      this.handleFlag(cliArgs);
    }
  }

  handleFlag(args) {
    let handled = false;
    if (args.h || args.help) {
      this.printHelpText();
      handled = true;
    }

    if (args.v || args.version) {
      /* eslint-disable no-console */
      console.log(require('../../package.json').version);
      /* eslint-enable no-console */
      handled = true;
    }

    if (handled) {
      process.exit(0);
      return;
    }

    // This is a fallback
    this.printHelpText();
    process.exit(1);
    return;
  }

  handleCommand(command, args, flags) {
    switch (command) {
      case 'start':
        if (args.length !== 1) {
          logHelper.error('You must include a service name so it can be ' +
            'stopped later on with \'stop <service name>\'');
          process.exit(1);
        }

        this.startService(args[0], flags);
        break;
      case 'stop': {
        if (args.length !== 1) {
          logHelper.error(`You must include a service name to be stopped.`);
          process.exit(1);
          return;
        }
        const wasStopped = this.stopService(args[0]);
        const exitCode = (wasStopped ? 0 : 1);
        process.exit(exitCode);
        break;
      }
      default:
        logHelper.error(`Invlaid command given '${command}'`);
        process.exit(1);
        break;
    }
  }

  startService(serviceName, flags) {
    if (!serviceName) {
      logHelper.error('To start a service you must provide a service name.');
      process.exit(1);
      return;
    }

    try {
      this.stopService(serviceName);

      logHelper.info('Starting service (This may take some time)....');

      const options = {};
      if (flags.p || flags.port) {
        options.port = flags.p || flags.port;
      }
      if (flags['log-file']) {
        options.logFile = flags['log-file'];
      }

      let stdioArgs = ['ipc', 'ignore', 'ignore'];

      // This is slightly hacky, but moves actual server to a bg process.
      const serviceProcess = spawn('node', [
        path.join(__dirname, 'detached-service.js'),
        JSON.stringify(options),
      ], {
        detached: true,
        stdio: stdioArgs,
      });

      serviceProcess.on('message', function(message) {
        if (message.serverStarted) {
          storage.setItemSync(serviceName, message.pid);
          serviceProcess.unref();

          logHelper.info('Service Running');
          process.exit(0);
        } else {
          logHelper.error(message.errorMessage);
          process.exit(1);
        }
      });
    } catch (err) {
      logHelper.error(err.message);
      process.exit(1);
    }
  }

  stopService(serviceName) {
    if (!serviceName) {
      logHelper.error('To stop a service you must provide a service name.');
      process.exit(1);
      return;
    }

    const servicePID = storage.getItemSync(serviceName);
    let serviceStopped = false;
    if (servicePID !== null) {
      try {
        execSync(`kill -9 ${servicePID} > /dev/null 2>&1`);
        serviceStopped = true;
      } catch (err) {
        // NOOP
      }
    }

    storage.removeItemSync(serviceName);

    return serviceStopped;
  }

  printHelpText() {
    /* eslint-disable max-len, no-console */
    console.log('web-push-testing-service');
    console.log('');
    console.log('Usage:');
    console.log('    web-push-testing-service [command] [options]');
    console.log('');
    console.log('Command:');
    console.log('    start <service-id>');
    console.log('    stop <service-id>');
    console.log('');
    console.log('Options:');
    console.log('    -h --help                     Show this screen.');
    console.log('    -p --port <Port Number>       Change port the service is run on.');
    console.log('       --log-file <Path>          Path and filename for logfile.');
    console.log('       --version                  Current version of CLI.');
    console.log('');
    /* eslint-enable line-length */
  }
}

module.exports = WPTSCLI;
