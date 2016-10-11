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

const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const CLI = require('../src/cli/index.js');

require('chai').should();

describe('Test Command Line Interface', function() {
  const originalExit = process.exit;
  const originalLog = console.log;

  let globalExitCode = -1;
  let globalServiceName = null;
  let globalLogs = [];

  const startLogCapture = () => {
    console.log = string => {
      globalLogs.push(string);
    };
  };

  const endLogCapture = () => {
    console.log = originalLog;
  };

  before(function() {
    process.exit = code => {
      globalExitCode = code;
    };
  });

  after(function() {
    process.exit = originalExit;
  });

  beforeEach(function() {
    globalLogs = [];
    globalExitCode = -1;
  });

  afterEach(function() {
    if (globalServiceName) {
      new CLI().argv(['stop', globalServiceName]);
      globalServiceName = null;
    }
  });

  it('should be able to require the cli from package.json', function() {
    const binValues = require('../package.json').bin;
    const cliPath = binValues['web-push-testing-service'];

    fs.accessSync(path.join(__dirname, '..', cliPath), fs.F_OK);
  });

  it('should show help text', function() {
    startLogCapture();

    const inputs = ['-h', '--help'];
    inputs.forEach(input => {
      new CLI().argv([input]);
    });
    globalExitCode.should.equal(0);

    endLogCapture();
  });

  it('should show version number', function() {
    startLogCapture();

    const inputs = ['-v', '--version'];
    inputs.forEach(input => {
      new CLI().argv([input]);
    });
    globalExitCode.should.equal(0);

    endLogCapture();

    const version = require('../package.json').version;
    globalLogs.length.should.equal(2);
    globalLogs.forEach(log => {
      log.should.equal(version);
    });
  });

  const createFullFlowTest = function(additionalArgs) {
    return function() {
      this.timeout(10 * 60 * 1000);
      globalServiceName = 'unit-test-' + Date.now();

      return new Promise(resolve => {
        process.exit = code => {
          globalExitCode = code;
          resolve();
        };

        const args = [];
        if (additionalArgs) {
          args.push(additionalArgs);
        }

        new CLI().argv(['start', globalServiceName]);
      })
      .then(() => {
        globalExitCode.should.equal(0);

        return fetch('http://localhost:8090/api/start-test-suite/', {
          method: 'POST'
        });
      })
      .then(response => {
        return response.json();
      })
      .then(response => {
        return fetch('http://localhost:8090/api/end-test-suite/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            testSuiteId: response.data.testSuiteId
          })
        });
      })
      .then(response => {
        return response.json();
      })
      .then(response => {
        (response.data.success).should.equal(true);

        return new Promise(resolve => {
          globalExitCode = -1;

          process.exit = code => {
            globalExitCode = code;
            resolve();
          };

          new CLI().argv(['stop', globalServiceName]);
        });
      })
      .then(() => {
        globalExitCode.should.equal(0);
      });
    };
  };

  it('should start and stop service correctly', createFullFlowTest());

  it('should start and stop service correctly with p flag', createFullFlowTest(['-p', 8081]));

  it('should start and stop service correctly with port flag', createFullFlowTest(['--port', 8082]));

  it('should return an error if the port is already in use', function() {
    this.timeout(10 * 60 * 1000);
    globalServiceName = 'unit-test-' + Date.now();

    return new Promise(resolve => {
      process.exit = code => {
        globalExitCode = code;
        resolve();
      };

      new CLI().argv(['start', globalServiceName, '-p', '8081']);
    })
    .then(() => {
      globalExitCode.should.equal(0);
    })
    .then(() => {
      return new Promise(resolve => {
        globalExitCode = -1;

        process.exit = code => {
          globalExitCode = code;
          resolve();
        };

        new CLI().argv(['start', globalServiceName + '-2', '-p', '8081']);
      });
    })
    .then(() => {
      globalExitCode.should.equal(1);
    })
    .then(() => {
      return new Promise(resolve => {
        globalExitCode = -1;

        process.exit = code => {
          globalExitCode = code;
          resolve();
        };

        new CLI().argv(['stop', globalServiceName]);
      });
    });
  });
});
