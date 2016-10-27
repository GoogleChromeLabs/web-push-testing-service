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

const fetch = require('node-fetch');
const spawn = require('child_process').spawn;

require('chai').should();

describe('Test start-test-suite API', function() {
  const WPTS = require('../src/index.js');

  const globalWPTS = new WPTS(8090);

  before(function() {
    // 8 Minures to complete
    this.timeout(60 * 8 * 1000);
    return globalWPTS.startService();
  });

  after(function() {
    return globalWPTS.endService();
  });

  function performCurlRequest(url) {
    return new Promise((resolve, reject) => {
      let responseBody = '';
      const curlProcess = spawn('curl', [
        url,
        '-X', 'POST'
      ]);

      curlProcess.stdout.on('data', data => {
        responseBody += data;
      });

      // curlProcess.stderr.on('data', data => {
      //   console.log(`stderr: ${data}`);
      // });

      curlProcess.on('error', err => {
        reject(err);
      });

      curlProcess.on('close', code => {
        if (code === 0) {
          resolve(responseBody);
        } else {
          reject(`child process exited with code ${code}`);
        }
      });
    });
  }

  it('should get a unique testSuiteId for several requests', function() {
    const NUMBER_OF_ATTEMPTS = 5;
    let promiseChain = Promise.resolve();
    const testSuiteIds = [];
    for (var i = 0; i < NUMBER_OF_ATTEMPTS; i++) {
      promiseChain = promiseChain.then(() => {
        return fetch(`http://localhost:8090/api/start-test-suite/`, {
          method: 'post'
        })
        .then(response => {
          response.status.should.equal(200);
          return response.json();
        })
        .then(response => {
          testSuiteIds.push(response.data.testSuiteId);
        });
      });
    }
    return promiseChain.then(() => {
      testSuiteIds.sort();

      for (let i = 0; i < testSuiteIds.length; i++) {
        if (testSuiteIds[i] === testSuiteIds[i + 1]) {
          throw new Error('Received matching testSuiteId: ' + testSuiteIds[i]);
        }

        // Make sure the testsuite exists
        (globalWPTS._testSuites[testSuiteIds[i]]).should.be.defined;
      }
    });
  });

  it('should get a unique testSuiteId for a CURL request', function() {
    const NUMBER_OF_ATTEMPTS = 5;
    let promiseChain = Promise.resolve();

    const testSuiteIds = [];
    for (var i = 0; i < NUMBER_OF_ATTEMPTS; i++) {
      promiseChain = promiseChain.then(() => {
        return performCurlRequest(`http://localhost:8090/api/start-test-suite/`)
        .then(response => {
          return JSON.parse(response);
        })
        .then(response => {
          testSuiteIds.push(response.data.testSuiteId);
        });
      });
    }

    return promiseChain.then(() => {
      testSuiteIds.sort();

      for (let i = 0; i < testSuiteIds.length; i++) {
        if (testSuiteIds[i] === testSuiteIds[i + 1]) {
          throw new Error('Received matching testSuiteId: ' + testSuiteIds[i]);
        }

        // Make sure the testsuite exists
        (globalWPTS._testSuites[testSuiteIds[i]]).should.be.defined;
      }
    });
  });
});
