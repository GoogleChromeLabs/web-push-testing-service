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
window.PUSH_TESTING_SERVICE = {};

function logMessage(text) {
  let logElement = document.querySelector('.js-log');

  let pElement = document.createElement('p');
  pElement.textContent = text;

  logElement.appendChild(pElement);
}

function waitForActive(registration) {
  let serviceWorker = registration.installing || registration.waiting ||
    registration.active;

  return new Promise(function(resolve, reject) {
    // Because the Promise function is called on next tick there is a
    // small chance that the worker became active already.
    if (serviceWorker.state === 'activated') {
      resolve(registration);
      return;
    }

    let stateChangeListener = function() {
      if (serviceWorker.state === 'activated') {
        resolve(registration);
      } else if (serviceWorker.state === 'redundant') {
        reject(new Error('Service worker is redundant.'));
      } else {
        return;
      }

      serviceWorker.removeEventListener('statechange', stateChangeListener);
    };

    serviceWorker.addEventListener('statechange', stateChangeListener);
  });
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  /* eslint-disable no-useless-escape */
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  /* eslint-enable no-useless-escape */

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

let vapidElement = document.querySelector('.js-vapid-element');
let subscriptionElement = document.querySelector('.js-subscription-element');

let getParamsString = window.location.search.replace('?', '');
let getParamsArgs = {};
if (getParamsString.length > 0) {
  const variables = getParamsString.split('&');
  if (variables.length !== 0) {
    variables.forEach((argString) => {
      let argDetails = argString.split('=');
      if (argDetails.length !== 2) {
        throw new Error('Invalid GET variables parsed in: ',
          window.location.search);
      }
      getParamsArgs[argDetails[0]] = argDetails[1];
    });
  }
}

window.PUSH_TESTING_SERVICE.getArgs = getParamsArgs;

if (getParamsArgs.vapidPublicKey) {
  const convertedVapidKey = urlBase64ToUint8Array(
    window.PUSH_TESTING_SERVICE.getArgs.vapidPublicKey
  );
  vapidElement.textContent = `"${getParamsArgs.vapidPublicKey}"    ` +
    `"${convertedVapidKey}"`;
} else {
  vapidElement.textContent = 'None';
}

window.PUSH_TESTING_SERVICE.start = function() {
  if (navigator.serviceWorker) {
    logMessage('Service worker supported');
    window.PUSH_TESTING_SERVICE.receivedMessages = [];

    navigator.serviceWorker.addEventListener('message', function(event) {
      window.PUSH_TESTING_SERVICE.receivedMessages.push(event.data);
      const messageList = document.querySelector('.js-message-list');
      while (messageList.firstChild) {
        messageList.removeChild(messageList.firstChild);
      }

      window.PUSH_TESTING_SERVICE.receivedMessages.forEach((msg) => {
        const listItem = document.createElement('li');
        listItem.textContent = msg;
        messageList.appendChild(listItem);
      });
    });

    // Service worker is supported
    // NOTE: Had to include window.location.origin to make firefox happy :(
    navigator.serviceWorker.register(window.location.origin + '/scripts/sw.js')
    .then((registration) => {
      window.PUSH_TESTING_SERVICE.swRegistered = true;

      logMessage('Service worker registered.');
      return waitForActive(registration)
      .then((registration) => {
        logMessage('Service worker is active.');
        const subscribeOptions = {
          userVisibleOnly: true,
        };
        if (window.PUSH_TESTING_SERVICE.getArgs.vapidPublicKey) {
          subscribeOptions.applicationServerKey =
            urlBase64ToUint8Array(
              window.PUSH_TESTING_SERVICE.getArgs.vapidPublicKey
            );
          logMessage(window.PUSH_TESTING_SERVICE.getArgs.vapidPublicKey);
          logMessage(subscribeOptions.applicationServerKey);
        }

        return registration.pushManager.subscribe(subscribeOptions)
        .then((subscription) => {
          logMessage('Registration is subscribed for push.');
          // Parse the subscription so we have the output we want to return.
          const parsedSubscription = JSON.parse(
            JSON.stringify(subscription)
          );

          // Add supportedContentEncodings for libraries that want this.
          const extraAttribs = {};
          if (PushManager.supportedContentEncodings) {
            extraAttribs.supportedContentEncodings =
              PushManager.supportedContentEncodings;
          }

          const detailsToSend = Object.assign(parsedSubscription, extraAttribs);

          // Make these details available.
          window.PUSH_TESTING_SERVICE.subscription = detailsToSend;
          subscriptionElement.textContent = JSON.stringify(detailsToSend);
        })
        .catch((err) => {
          window.PUSH_TESTING_SERVICE.subscription = {
            error: err.message,
          };

          logMessage('Push subscribe() failed: ' + err.message);
        });
      });
    })
    .catch((err) => {
      window.PUSH_TESTING_SERVICE.swRegistered = {
        error: err.message,
      };

      logMessage('Service worker register failed: ' + err.message);
    });
  } else {
    logMessage('Service worker not supported');
  }
};

window.PUSH_TESTING_SERVICE.loaded = true;
