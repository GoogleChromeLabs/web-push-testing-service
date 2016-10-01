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

require('chai').should();

describe('Test end-test-suite API', function() {
  const WPTS = require('../src/index.js');

  const globalWPTS = new WPTS(8090);

  beforeEach(function() {
    // 8 Minures to complete
    this.timeout(60 * 8 * 1000);
    return globalWPTS.startService();
  });

  afterEach(function() {
    return globalWPTS.endService();
  });

  it('should be able to end valid tests', function() {
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

      let endPromiseChain = Promise.resolve();
      for (let i = 0; i < testSuiteIds.length; i++) {
        endPromiseChain = endPromiseChain.then(() => {
          return fetch(`http://localhost:8090/api/end-test-suite/`, {
            method: 'post',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              testSuiteId: testSuiteIds[i]
            })
          })
          .then(response => {
            response.status.should.equal(200);
            return response.json();
          })
          .then(response => {
            (response.data.success).should.equal(true);
          });
        });
      }

      return endPromiseChain;
    })
    .then(() => {
      Object.keys(globalWPTS._testSuites).length.should.equal(0);
    });
  });

  it('should be able to handle bad input for testSuiteId', function() {
    const badValues = [
      {testSuiteId: 'test'},
      {testSuiteId: '1234'},
      {testSuiteId: {}},
      {testSuiteId: []},
      {TeStSuItEiD: 1}
    ];

    const promises = badValues.map(badValue => {
      return fetch('http://localhost:8090/api/end-test-suite/', {
        method: 'post',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(badValue)
      });
    });
    return Promise.all(promises)
    .then(responses => {
      const promises = responses.map(response => {
        response.status.should.equal(400);
        return response.json();
      });

      return Promise.all(promises);
    })
    .then(responses => {
      responses.forEach(response => {
        (typeof response.error).should.not.equal('undefined');
        (typeof response.error.id).should.not.equal('undefined');
        (typeof response.error.message).should.not.equal('undefined');
      });
    });
  });

  it('should return error for empty body field', function() {
    return fetch('http://localhost:8090/api/end-test-suite/', {
      method: 'post'
    })
    .then(response => {
      response.status.should.equal(400);
      return response.json();
    })
    .then(response => {
      (typeof response.error).should.not.equal('undefined');
      (response.error.id).should.equal('missing_required_args');
      (typeof response.error.message).should.not.equal('undefined');
    });
  });

  it('should return error for non-existant testSuiteId', function() {
    return fetch('http://localhost:8090/api/end-test-suite/', {
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        testSuiteId: 0
      })
    })
    .then(response => {
      response.status.should.equal(400);
      return response.json();
    })
    .then(response => {
      (typeof response.error).should.not.equal('undefined');
      (response.error.id).should.equal('invalid_test_suite_id');
      (typeof response.error.message).should.not.equal('undefined');
    });
  });
});
