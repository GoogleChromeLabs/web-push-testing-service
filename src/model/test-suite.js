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

const seleniumAssistant = require('selenium-assistant');

class TestSuite {
  constructor(id) {
    if (typeof id !== 'number') {
      throw new Error('Invalid ID value passed into TestSuite constructor');
    }

    this._id = id;
    this._nextAvailableTestId = 0;
    this._runningTests = {};
  }

  get id() {
    return this._id;
  }

  addTestInstance(driver) {
    const testInstaceId = this._nextAvailableTestId;
    this._nextAvailableTestId++;

    this._runningTests[testInstaceId] = driver;
    return testInstaceId;
  }

  getTestInstance(testInstanceId) {
    if (this._runningTests[testInstanceId]) {
      return this._runningTests[testInstanceId];
    }

    return null;
  }

  end() {
    const promises = Object.keys(this._runningTests).map((testId) => {
      return seleniumAssistant.killWebDriver(this._runningTests[testId]);
    });
    return Promise.all(promises);
  }
}

module.exports = TestSuite;
