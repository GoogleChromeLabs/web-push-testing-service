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
const expect = require('chai').expect;

require('chai').should();

describe('API Server', function() {
  const APIServer = require('../src/server/api-server.js');

  let globalServer;

  beforeEach(function() {
    if (globalServer) {
      globalServer.kill();
    }

    globalServer = null;
  });

  after(function() {
    if (globalServer) {
      globalServer.kill();
    }

    globalServer = null;
  });

  it('should throw an error when a bad port is defined', function() {
    expect(function() {
      globalServer = new APIServer();
    }).to.throw;

    expect(function() {
      globalServer = new APIServer(null);
    }).to.throw;

    expect(function() {
      globalServer = new APIServer('8080');
    }).to.throw;

    expect(function() {
      globalServer = new APIServer({port: 8080});
    }).to.throw;

    expect(function() {
      globalServer = new APIServer([8080]);
    }).to.throw;
  });

  it('should reject for an invalid port number', function() {
    expect(function() {
      globalServer = new APIServer(1);
      return globalServer.startListening();
    }).to.throw;
  });

  it('should resolve for a valid port number', function() {
    globalServer = new APIServer(8090);
    return globalServer.startListening()
    .then(() => {
      return fetch('http://localhost:8090/api/status-check', {
        method: 'post'
      });
    })
    .then(response => {
      response.status.should.equal(200);
    });
  });

  const apis = [
    {
      endpoint: '/api/start-test-suite/',
      eventName: 'start-test-suite'
    },
    {
      endpoint: '/api/end-test-suite/',
      eventName: 'end-test-suite'
    },
    {
      endpoint: '/api/get-subscription/',
      eventName: 'get-subscription'
    },
    {
      endpoint: '/api/get-notification-status/',
      eventName: 'get-notification-status'
    }
  ];

  apis.forEach(apiInfo => {
    it(`should return error if '${apiInfo.endpoint}' is not handled`, function() {
      globalServer = new APIServer(8090);

      return globalServer.startListening()
      .then(() => {
        return fetch(`http://localhost:8090${apiInfo.endpoint}`, {
          method: 'post'
        });
      })
      .then(response => {
        response.status.should.equal(400);

        return response.json();
      })
      .then(response => {
        (typeof response.error).should.not.equal('undefined');
        response.error.id.should.equal('no_handlers');
        (typeof response.error.message).should.not.equal('undefined');
      });
    });

    it(`should return valid response if '${apiInfo.endpoint}' is handled`, function() {
      globalServer = new APIServer(8090);
      globalServer.on(apiInfo.eventName, res => {
        APIServer.sendValidResponse(res, 'OK');
      });

      return globalServer.startListening()
      .then(() => {
        return fetch(`http://localhost:8090${apiInfo.endpoint}`, {
          method: 'post'
        });
      })
      .then(response => {
        response.status.should.equal(200);

        return response.json();
      })
      .then(response => {
        (typeof response.data).should.not.equal('undefined');
        response.data.should.equal('OK');
      });
    });
  });

  // TODO Add test for sendValidResponse
  //
  // TODO Add test for sendErrorResponse
});
