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

      m[collection._prefix + 'update'] = function (selector, mutator, options) {
        var methodInvocation = this;

        // xcxc make sure -- should this always be called? at top?
        collection._maybe_snapshot();

        if (!collection._restricted) {
          // update returns nothing.  allow exceptions to propagate.
          collection._collection.update.apply(collection._collection, _.toArray(arguments));
        } else {
          if (collection._validators.update.length === 0) {
            throw new Meteor.Error("Collection restricted but no update validators set");
          }

          // xcxc disallow non-$set arguments (which will be necessary when computing fields)

          // xcxc fields not documented in docs.meteor.com?
          var objects = collection._collection.find(selector/*, {fields: {_id: 1}} xcxc optimize not loading all fields*/).fetch();

          var disallow = _.any(collection._validators.update, function(validator) {
            return !validator(methodInvocation.userId(), objects /* xcxc, fields, modifier */);
          });

          if (disallow)
            throw new Meteor.Error("Access Denied"); // xcxc use class

          var idInClause = {};
          idInClause.$in = _.map(objects, function(object) {
            return object._id;
          });

          var idSelector = {_id: idInClause};

          // xcxc do something with options!

          collection._collection.update.call(
            collection._collection,
            idSelector,
            mutator,
            options);
        }
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