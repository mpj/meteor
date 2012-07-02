Package.describe({
  summary: "xcxc",
  internal: false
});

Package.on_use(function (api) {
  api.add_files(['insecure.js'], ['server', 'client']);
});
