(function (global) {
  "use strict";

  global.SiteApi = {
    baseUrl: "",

    request: function (path, options) {
      var opts = options || {};
      var headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
      var url = this.baseUrl + path;

      return fetch(url, {
        method: opts.method || "GET",
        headers: headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined
      }).then(function (response) {
        return response.json().catch(function () {
          return {};
        }).then(function (data) {
          if (!response.ok) {
            var error = new Error(data.message || "요청에 실패했습니다.");
            error.status = response.status;
            throw error;
          }
          return data;
        });
      });
    },

    getPosts: function () {
      return this.request("/api/posts");
    },

    getPost: function (id) {
      return this.request("/api/posts/" + encodeURIComponent(id));
    },

    getActivePopups: function () {
      return this.request("/api/popups/active").then(function (data) {
        return Array.isArray(data) ? data : data ? [data] : [];
      });
    },

    adminRequest: function (path, options) {
      var token = sessionStorage.getItem("adminToken");
      var opts = options || {};
      opts.headers = Object.assign({}, opts.headers || {}, {
        Authorization: "Bearer " + token
      });
      return this.request(path, opts);
    },

    adminUpload: function (path, formData) {
      var token = sessionStorage.getItem("adminToken");
      var url = this.baseUrl + path;

      return fetch(url, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token
        },
        body: formData
      }).then(function (response) {
        return response.json().catch(function () {
          return {};
        }).then(function (data) {
          if (!response.ok) {
            var error = new Error(data.message || "업로드에 실패했습니다.");
            error.status = response.status;
            throw error;
          }
          return data;
        });
      });
    }
  };
})(window);
