'use strict';

class Base {
  constructor(client, msg) {
    Object.defineProperty(this, 'client', {
      value: client,
      writable: false,
    });
    Object.defineProperty(this, 'bot', {
      value: this.client,
      writable: false,
    });
    Object.defineProperty(this, 'm', {
      value: msg,
      writable: false,
    });
  }

  _clone() {
    return Object.assign(Object.create(this), this);
  }

  _patch(data) {
    return data;
  }
}

module.exports = Base;
