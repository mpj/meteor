// xcxc different file name
// xcxc move to another package?

// xcxc tests:
// - if you set just an insert, then update and remove are closed, and vice versa
// - if you just set an insert once; and then just set an update, both of them are set
//   (and not that they both never happen)

// Thrown when trying to run a mutation that's not allowed
Meteor.AccessDeniedError = function() {
  this.message = "Access Denied";
};

Meteor.Collection.prototype.allow = function(options) {
  var self = this;

  self._restricted = true;

  if (options.insert) {
    self._validators.insert.push(options.insert);
  }

  if (options.update) {
    self._validators.update.push(options.update);
  }

  // xcxc do update, remove!!!
};