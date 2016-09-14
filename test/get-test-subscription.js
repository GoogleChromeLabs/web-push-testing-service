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
const webPush = require('web-push');
const urlsafeBase64 = require('urlsafe-base64');

require('chai').should();

const bufferVapidKeys = webPush.generateVAPIDKeys();
console.log(bufferVapidKeys.publicKey);

const VAPID_KEYS = {
  public: urlsafeBase64.encode(bufferVapidKeys.publicKey),
  private: urlsafeBase64.encode(bufferVapidKeys.privateKey)
};
console.log(VAPID_KEYS.public);

const GCM_DETAILS = {
  senderId: '653317226796',
  apiKey: 'AIzaSyBBh4ddPa96rQQNxqiq_qQj7sq1JdsNQUQ'
};

describe('Test get-subscription API', function() {
  const WPTS = require('../src/index.js');

  const globalWPTS = new WPTS(8090);

  const browserVariants = [
    {
      browser: 'chrome',
      version: 'stable'
    },
    {
      browser: 'chrome',
      version: 'beta'
    },
    {
      browser: 'chrome',
      version: 'unstable'
    },
    {
      browser: 'firefox',
      version: 'stable'
    },
    {
      browser: 'firefox',
      version: 'beta'
    },
    {
      browser: 'firefox',
      version: 'unstable'
    }
  ];

  let globalTestSuiteId;

  before(function() {
    this.timeout(180000);
    return globalWPTS.startService();
  });

  after(function() {
    return globalWPTS.endService();
  });

  beforeEach(function() {
    // Create new test suite
    return fetch(`http://localhost:8090/api/start-test-suite/`, {
      method: 'post'
    })
    .then(response => {
      return response.json();
    })
    .then(response => {
      if (response.error) {
        throw new Error('No testSuiteId returned');
      }

      globalTestSuiteId = response.data.testSuiteId;
    });
  });

  afterEach(function() {
    this.timeout(6000);
    // End test suite
    return fetch(`http://localhost:8090/api/end-test-suite/`, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        testSuiteId: globalTestSuiteId
      })
    })
    .then(response => {
      return response.json();
    })
    .then(response => {
      if (response.error) {
        throw new Error('Unable to end test suite.');
      }
    });
  });

  const validateSubscriptionResponse = response => {
    if (!response.data) {
      throw new Error('Expected response.data to be defined, instead ' +
        'received: ' + JSON.stringify(response));
    }

    (typeof response.data.testId).should.not.equal('undefined');
    (typeof response.data.subscription).should.not.equal('undefined');

    const pushSubscription = response.data.subscription;
    (typeof pushSubscription.endpoint).should.not.equal('undefined');

    if (pushSubscription.keys) {
      (typeof pushSubscription.keys.p256dh).should.not.equal('undefined');
      (typeof pushSubscription.keys.auth).should.not.equal('undefined');
    }
  };

  const sendPushMessage = (suiteId, testId, subscription) => {
    const expectedPayload = Date.now().toString();

    return new Promise(resolve => {
      setTimeout(resolve, 4000);
    })
    .then(() => {
      webPush.setGCMAPIKey(GCM_DETAILS.apiKey);
      const notificationOptions = {
        payload: expectedPayload,
        userPublicKey: subscription.keys.p256dh,
        userAuth: subscription.keys.auth,
        vapid: {
          subject: 'mailto: web-push-testing-service@example.com',
          publicKey: bufferVapidKeys.publicKey,
          privateKey: bufferVapidKeys.privateKey
        }
      };
      return webPush.sendNotification(subscription.endpoint, notificationOptions)
      .catch(err => {
        console.log(err);
        throw err;
      });
    })
    .then(() => {
      return new Promise(resolve => {
        setTimeout(resolve, 1000);
      });
    })
    .then(() => {
      return fetch(`http://localhost:8090/api/get-notification-status/`, {
        method: 'post',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          testSuiteId: globalTestSuiteId,
          testId: testId
        })
      });
    })
    .then(response => {
      return response.json();
    })
    .then(response => {
      if (response.error) {
        throw new Error('Bad response: ' + response.error.message);
      }

      response.data.messages.length.should.equal(1);
      response.data.messages[0].should.equal(expectedPayload);
    });
  };

  it('should error when given no input', function() {
    return fetch(`http://localhost:8090/api/get-subscription/`, {
      method: 'post'
    })
    .then(response => {
      response.status.should.equal(400);
      return response.json();
    })
    .then(response => {
      (typeof response.error).should.not.equal('undefined');
      response.error.id.should.equal('missing_required_args');
      (typeof response.error.message).should.not.equal('undefined');
    });
  });

  it('should error when given bad testSuiteId inputs', function() {
    const badInputs = [
      {
        browserName: 'chrome',
        browserVersion: 'stable'
      },
      {
        testSuiteId: '',
        browserName: 'chrome',
        browserVersion: 'stable'
      },
      {
        testSuiteId: {},
        browserName: 'chrome',
        browserVersion: 'stable'
      },
      {
        testSuiteId: [],
        browserName: 'chrome',
        browserVersion: 'stable'
      },
      {
        testSuiteId: 99999999,
        browserName: 'chrome',
        browserVersion: 'stable'
      },
      {
        testSuiteId: -1,
        browserName: 'chrome',
        browserVersion: 'stable'
      }
    ];

    const promises = badInputs.map(badValue => {
      return fetch(`http://localhost:8090/api/get-subscription/`, {
        method: 'post',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(badValue)
      });
    });

    return Promise.all(promises)
    .then(responses => {
      const promises = responses.map((response, index) => {
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

  it('should error when given bad browserName inputs', function() {
    const badInputs = [
      {
        testSuiteId: globalTestSuiteId,
        browserVersion: 'stable'
      },
      {
        testSuiteId: globalTestSuiteId,
        browserName: '',
        browserVersion: 'stable'
      },
      {
        testSuiteId: globalTestSuiteId,
        browserName: {},
        browserVersion: 'stable'
      },
      {
        testSuiteId: globalTestSuiteId,
        browserName: [],
        browserVersion: 'stable'
      },
      {
        testSuiteId: globalTestSuiteId,
        browserName: 99999999,
        browserVersion: 'stable'
      },
      {
        testSuiteId: globalTestSuiteId,
        browserName: 'made-up',
        browserVersion: 'stable'
      }
    ];

    const promises = badInputs.map(badValue => {
      return fetch(`http://localhost:8090/api/get-subscription/`, {
        method: 'post',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(badValue)
      });
    });

    return Promise.all(promises)
    .then(responses => {
      const promises = responses.map((response, index) => {
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

  it('should error when given bad browserVersion inputs', function() {
    const badInputs = [
      {
        testSuiteId: globalTestSuiteId,
        browserName: 'chrome'
      },
      {
        testSuiteId: globalTestSuiteId,
        browserName: 'chrome',
        browserVersion: ''
      },
      {
        testSuiteId: globalTestSuiteId,
        browserName: 'chrome',
        browserVersion: {}
      },
      {
        testSuiteId: globalTestSuiteId,
        browserName: 'chrome',
        browserVersion: []
      },
      {
        testSuiteId: globalTestSuiteId,
        browserName: 'chrome',
        browserVersion: 99999999
      },
      {
        testSuiteId: globalTestSuiteId,
        browserName: 'chrome',
        browserVersion: 'made-up'
      }
    ];

    const promises = badInputs.map(badValue => {
      return fetch(`http://localhost:8090/api/get-subscription/`, {
        method: 'post',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(badValue)
      });
    });

    return Promise.all(promises)
    .then(responses => {
      const promises = responses.map((response, index) => {
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

  browserVariants.forEach(browserVariant => {
    it(`should be able to get a subscription from ${browserVariant.browser} - ${browserVariant.version} with no additional info`, function() {
      // This requires starting / stopping selenium tests
      if (process.env.TRAVIS) {
        this.retries(3);
      }
      this.timeout(10000);

      return fetch(`http://localhost:8090/api/get-subscription/`, {
        method: 'post',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          testSuiteId: globalTestSuiteId,
          browserName: browserVariant.browser,
          browserVersion: browserVariant.version
        })
      })
      .then(response => {
        return response.json();
      })
      .then(response => {
        if (response.error) {
          switch (response.error.id) {
            case 'bad_browser_support':
              return;
            case 'unable_to_get_subscription':
              return;
            default:
              throw new Error('Unknown error from server: ' +
                JSON.stringify(response));
          }
        }

        validateSubscriptionResponse(response);

        return sendPushMessage(globalTestSuiteId, response.data.testId,
          response.data.subscription);
      });
    });

    it(`should be able to get a subscription from ${browserVariant.browser} - ${browserVariant.version} with VAPID support`, function() {
      // This requires starting / stopping selenium tests
      if (process.env.TRAVIS) {
        this.retries(3);
      }
      this.timeout(10000);

      return fetch(`http://localhost:8090/api/get-subscription/`, {
        method: 'post',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          testSuiteId: globalTestSuiteId,
          browserName: browserVariant.browser,
          browserVersion: browserVariant.version,
          vapidPublicKey: VAPID_KEYS.public
        })
      })
      .then(response => {
        return response.json();
      })
      .then(response => {
        if (response.error) {
          response.error.id.should.equal('bad_browser_support');
          return;
        }

        validateSubscriptionResponse(response);

        return sendPushMessage(globalTestSuiteId, response.data.testId,
          response.data.subscription);
      });
    });

    it(`should be able to get a subscription from ${browserVariant.browser} - ${browserVariant.version} with a GCM Sender ID`, function() {
      // This requires starting / stopping selenium tests
      if (process.env.TRAVIS) {
        this.retries(3);
      }
      this.timeout(120000);

      return fetch(`http://localhost:8090/api/get-subscription/`, {
        method: 'post',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          testSuiteId: globalTestSuiteId,
          browserName: browserVariant.browser,
          browserVersion: browserVariant.version,
          gcmSenderId: GCM_DETAILS.senderId
        })
      })
      .then(response => {
        return response.json();
      })
      .then(response => {
        if (response.error) {
          response.error.id.should.equal('bad_browser_support');
          return;
        }

        validateSubscriptionResponse(response);

        return sendPushMessage(globalTestSuiteId, response.data.testId,
          response.data.subscription);
      });
    });

    it(`should be able to get a subscription from ${browserVariant.browser} - ${browserVariant.version} with VAPID and a GCM Sender ID`, function() {
      // This requires starting / stopping selenium tests
      if (process.env.TRAVIS) {
        this.retries(3);
      }
      this.timeout(10000);

      return fetch(`http://localhost:8090/api/get-subscription/`, {
        method: 'post',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          testSuiteId: globalTestSuiteId,
          browserName: browserVariant.browser,
          browserVersion: browserVariant.version,
          vapidPublicKey: VAPID_KEYS.public,
          gcmSenderId: GCM_DETAILS.senderId
        })
      })
      .then(response => {
        return response.json();
      })
      .then(response => {
        if (response.error) {
          response.error.id.should.equal('bad_browser_support');
          return;
        }

        validateSubscriptionResponse(response);

        return sendPushMessage(globalTestSuiteId, response.data.testId,
          response.data.subscription);
      });
    });
  });
});
