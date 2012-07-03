// xcxc add remove to all collections
// xcxc add a test that calling allowed with only some modifiers restricts the collection
// xcxc add a test verifying that not all fields are loaded
// xcxc add a test that multiple calls to allow add onto each other as "AND" rather than "OR"
// xcxc test for "no insert validators set" etc

(function () {
  var defineCollection = function(name, insecure) {
    var oldInsecure = Meteor.insecure;
    Meteor.insecure = insecure;
    var collection = new Meteor.Collection(name);
    Meteor.insecure = oldInsecure;

    if (Meteor.is_server) {
      Meteor.publish("collection-" + name, function() {
        return collection.find();
      });

      m = {};
      m["clear-collection-" + name] = function() {
        collection.remove({});
      };
      Meteor.methods(m);
    } else {
      Meteor.subscribe("collection-" + name);
    }

    collection.callClearMethod = function (callback) {
      Meteor.call("clear-collection-" + name, callback);
    };
    return collection;
  };

  // totally insecure collection
  insecureCollection = defineCollection(
    "collection-insecure", true /*insecure*/);

  // totally locked down collection
  lockedDownCollection = defineCollection(
    "collection-locked-down", false /*insecure*/);

  // secured collection with same allowed modifications, both with and
  // without the `insecure` package
  securedCollectionDefaultSecure = defineCollection(
    "collection-securedDefaultSecure", false /*insecure*/);
  securedCollectionDefaultInsecure = defineCollection(
    "collection-securedDefaultInsecure", true /*insecure*/);
  var allow = {
    insert: function(userId, doc) {
      return doc.canModify;
    },
    update: function(userId, objects, fields, modifier) { // xcxc "modifier" - standardize call sites
      return (-1 === _.indexOf(fields, 'verySecret')) &&
        _.all(objects, function (object) {
          return object.canUpdate;
        });
    }
  };
  securedCollectionDefaultSecure.allow(allow);
  // xcxc should these be run on the client as well?
  securedCollectionDefaultInsecure.allow(allow);

  if (Meteor.is_client) {
    testAsyncMulti("collection - insecure", [
      function (test, expect) {
        insecureCollection.callClearMethod(expect(function() {}));
      },
      function (test, expect) {
        insecureCollection.insert({foo: 'bar'}, expect(function(err, res) {
          test.equal(insecureCollection.find().count(), 1);
          test.equal(insecureCollection.findOne().foo, 'bar');
        }));
        test.equal(insecureCollection.find().count(), 1);
        test.equal(insecureCollection.findOne().foo, 'bar');
      }
    ]);

    testAsyncMulti("collection - locked down", [
      function (test, expect) {
        insecureCollection.callClearMethod(expect(function() {}));
      },
      function (test, expect) {
        lockedDownCollection.insert({foo: 'bar'}, expect(function (err, res) {
          test.equal(err.error, "Access denied");
          test.equal(lockedDownCollection.find().count(), 0);
        }));
      }
    ]);

    testAsyncMulti("collection - secured", [
      function (test, expect) {
        _.each(
          [securedCollectionDefaultInsecure, securedCollectionDefaultSecure],
          function(collection) {
            collection.callClearMethod(expect(function() {}));
          });
      },
      // insert
      function (test, expect) {
        _.each(
          [securedCollectionDefaultInsecure, securedCollectionDefaultSecure],
          function(collection) {
            console.log(1);
            collection.insert({canModify: false}, expect(function (err, res) {
              console.log(2);
              test.equal(err.error, "Access denied");
              test.equal(collection.find().count(), 0);
            }));
          });
      },
      function (test, expect) {
        _.each(
          [securedCollectionDefaultInsecure, securedCollectionDefaultSecure],
          function(collection) {
            console.log(3);
            collection.insert({canModify: true}, expect(function (err, res) {
              console.log(4);
              test.isFalse(err);
              test.equal(collection.find().count(), 1);
              test.equal(collection.findOne().canModify, true);
            }));
          });
      },
      function (test, expect) {
        _.each(
          [securedCollectionDefaultInsecure, securedCollectionDefaultSecure],
          function(collection) {
            collection.update({canModify: false}, {$set: {updated: true}}, expect(function (err, res) {
              test.isFalse(err);
              // nothing has changed
              test.equal(collection.find().count(), 1);
              test.equal(collection.findOne().updated, undefined);
            }));
          });
      },
      // xcxc rethink canInsert/canUpdate
      function (test, expect) {
        _.each(
          [securedCollectionDefaultInsecure, securedCollectionDefaultSecure],
          function(collection) {
            collection.update({canModify: true}, {$set: {verySecret: true}}, expect(function (err, res) {
              test.equal(err.error, "Access denied");
              // nothing has changed
              test.equal(collection.find().count(), 1);
              test.equal(collection.findOne().updated, undefined);
            }));
          });
      },
      function (test, expect) {
        _.each(
          [securedCollectionDefaultInsecure, securedCollectionDefaultSecure],
          function(collection) {
            collection.update({canModify: true}, {$set: {updated: true, verySecret: true}}, expect(function (err, res) {
              test.equal(err.error, "Access denied");
              // nothing has changed
              test.equal(collection.find().count(), 1);
              test.equal(collection.findOne().updated, undefined);
            }));
          });
      },
      function (test, expect) {
        _.each(
          [securedCollectionDefaultInsecure, securedCollectionDefaultSecure],
          function(collection) {
            collection.update({canModify: true}, {$set: {updated: true}}, expect(function (err, res) {
              test.isFalse(err);
              test.equal(collection.find().count(), 1);
              test.equal(collection.findOne().updated, true);
            }));
          });
      }
    ]);
  }
}) ();
