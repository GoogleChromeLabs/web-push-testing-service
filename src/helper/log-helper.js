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

const chalk = require('chalk');
const winston = require('winston');

class LogHelper {
  constructor() {
    winston.remove(winston.transports.Console);
  }

  setLogFile(file) {
    try {
      winston.add(winston.transports.File, {
        filename: file,
        handleExceptions: true,
        humanReadableUnhandledException: true
      });
    } catch (err) {
      // NOOP
    }
  }

  warn(msg) {
    console.warn(chalk.yellow('[WARNING]: ') + msg);
    winston.warn(msg);
  }

  error(msg) {
    console.error(chalk.red('[ERROR]: ') + msg);
    winston.error(msg);
  }

  info(msg) {
    console.log(chalk.dim('[INFO]: ') + msg);
    winston.info(msg);
  }
}

module.exports = new LogHelper();
