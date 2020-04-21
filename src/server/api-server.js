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

const EventEmitter = require('events').EventEmitter;
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const logHelper = require('../helper/log-helper');

class APIServer extends EventEmitter {
  constructor(port) {
    super();

    if (typeof port !== 'number') {
      logHelper.error(`APIServer received an invalid port number: '${port}'`);
      throw new Error(`APIServer received an invalid port number: '${port}'`);
    }

    this._port = port;
    this._host = 'localhost';

    this._expressApp = express();
    this._expressApp.use(bodyParser.json());
    this._expressApp.use(bodyParser.urlencoded({
      extended: true,
    }));

    this._expressApp.use(express.static(path.join(__dirname, '..', 'static')));

    this._expressApp.post('/api/status-check', this.statusCheck.bind(this));
    this._expressApp.post('/api/start-test-suite/',
      this.startTestSuite.bind(this));
    this._expressApp.post('/api/end-test-suite/', this.endTestSuite.bind(this));
    this._expressApp.post('/api/get-subscription/',
      this.getSubscription.bind(this));
    this._expressApp.post('/api/get-notification-status/',
      this.getNotificationStatus.bind(this));
  }

  getUrl() {
    return `http://${this._host}:${this._port}`;
  }

  kill() {
    if (this._expressServer) {
      this._expressServer.close();
    }

    return Promise.resolve();
  }

  startListening() {
    return new Promise((resolve, reject) => {
      this._expressServer = this._expressApp.listen(
        this._port, this._host, () => {
          resolve(this.getUrl());
        }
      );

      this._expressServer.on('error', (err) => {
        logHelper.error(`Unable to start service at ${this.getUrl()}. ` +
          `${err.message}`);
        reject(err);
      });
    });
  }

  statusCheck(req, res) {
    res.sendStatus(200);
  }

  startTestSuite(req, res) {
    const listenedTo = this.emit('start-test-suite', res, req.body);
    if (!listenedTo) {
      APIServer.sendErrorResponse(res, 'no_handlers', 'Nothing was set up to ' +
        'listen for this request and handle it.');
    }
  }

  endTestSuite(req, res) {
    const listenedTo = this.emit('end-test-suite', res, req.body);
    if (!listenedTo) {
      APIServer.sendErrorResponse(res, 'no_handlers', 'Nothing was set up to ' +
        'listen for this request and handle it.');
    }
  }

  getSubscription(req, res) {
    const listenedTo = this.emit('get-subscription', res, req.body);
    if (!listenedTo) {
      APIServer.sendErrorResponse(res, 'no_handlers', 'Nothing was set up to ' +
        'listen for this request and handle it.');
    }
  }

  getNotificationStatus(req, res) {
    const listenedTo = this.emit('get-notification-status', res, req.body);
    if (!listenedTo) {
      APIServer.sendErrorResponse(res, 'no_handlers', 'Nothing was set up to ' +
        'listen for this request and handle it.');
    }
  }

  static sendValidResponse(res, data) {
    if (!data) {
      data = {success: true};
    }

    res.send({
      data: data,
    });
  }

  static sendErrorResponse(res, errorId, errorMsg) {
    res.status(400).send({
      error: {
        id: errorId,
        message: errorMsg,
      },
    });
  }
}

module.exports = APIServer;
