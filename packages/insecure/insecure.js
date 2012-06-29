Meteor.startup(function() {
  _.each(Meteor._collections, function(collection) {

    var manager = collection._manager;
    if (manager) {
      var m = {};

      console.log('xcxc', collection._prefix);

      m[collection._prefix + 'insert'] = function (object) {
        var methodInvocation = this;
        if (_.any(collection._validators.insert, function(validator) {
          return !validator(methodInvocation.userId(), object);
        })) {
          throw new Meteor.Error("Access Denied"); // xcxc use Meteor.AccessDeniedError?
        };

        // xcxc why do we need this _maybe_snapshot here? we don't seem
        // to do that for other methods...?  oh, maybe since other
        // methods all go through these insert/update/remove ones?

        collection._maybe_snapshot();
        // insert returns nothing.  allow exceptions to propagate.
        collection._collection.insert.apply(collection._collection, _.toArray(arguments));
      };



      // xcxc do these!!!

      m[collection._prefix + 'update'] = function (/* selector, mutator, options */) {
        collection._maybe_snapshot();
        // update returns nothing.  allow exceptions to propagate.
        collection._collection.update.apply(collection._collection, _.toArray(arguments));
      };

      m[collection._prefix + 'remove'] = function (/* selector */) {
        collection._maybe_snapshot();
        // remove returns nothing.  allow exceptions to propagate.
        collection._collection.remove.apply(collection._collection, _.toArray(arguments));
      };

      manager.methods(m);
    }
  });
});