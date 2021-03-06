/* */ 
(function(process) {
  (function() {
    var root = this;
    var previousBackbone = root.Backbone;
    var slice = Array.prototype.slice;
    var splice = Array.prototype.splice;
    var Backbone;
    if (typeof exports !== 'undefined') {
      Backbone = exports;
    } else {
      Backbone = root.Backbone = {};
    }
    Backbone.VERSION = '0.9.1';
    var _ = root._;
    if (!_ && (typeof require !== 'undefined'))
      _ = require('underscore');
    var $ = root.jQuery || root.Zepto || root.ender;
    Backbone.setDomLibrary = function(lib) {
      $ = lib;
    };
    Backbone.noConflict = function() {
      root.Backbone = previousBackbone;
      return this;
    };
    Backbone.emulateHTTP = false;
    Backbone.emulateJSON = false;
    Backbone.Events = {
      on: function(events, callback, context) {
        var ev;
        events = events.split(/\s+/);
        var calls = this._callbacks || (this._callbacks = {});
        while (ev = events.shift()) {
          var list = calls[ev] || (calls[ev] = {});
          var tail = list.tail || (list.tail = list.next = {});
          tail.callback = callback;
          tail.context = context;
          list.tail = tail.next = {};
        }
        return this;
      },
      off: function(events, callback, context) {
        var ev,
            calls,
            node;
        if (!events) {
          delete this._callbacks;
        } else if (calls = this._callbacks) {
          events = events.split(/\s+/);
          while (ev = events.shift()) {
            node = calls[ev];
            delete calls[ev];
            if (!callback || !node)
              continue;
            while ((node = node.next) && node.next) {
              if (node.callback === callback && (!context || node.context === context))
                continue;
              this.on(ev, node.callback, node.context);
            }
          }
        }
        return this;
      },
      trigger: function(events) {
        var event,
            node,
            calls,
            tail,
            args,
            all,
            rest;
        if (!(calls = this._callbacks))
          return this;
        all = calls['all'];
        (events = events.split(/\s+/)).push(null);
        while (event = events.shift()) {
          if (all)
            events.push({
              next: all.next,
              tail: all.tail,
              event: event
            });
          if (!(node = calls[event]))
            continue;
          events.push({
            next: node.next,
            tail: node.tail
          });
        }
        rest = slice.call(arguments, 1);
        while (node = events.pop()) {
          tail = node.tail;
          args = node.event ? [node.event].concat(rest) : rest;
          while ((node = node.next) !== tail) {
            node.callback.apply(node.context || this, args);
          }
        }
        return this;
      }
    };
    Backbone.Events.bind = Backbone.Events.on;
    Backbone.Events.unbind = Backbone.Events.off;
    Backbone.Model = function(attributes, options) {
      var defaults;
      attributes || (attributes = {});
      if (options && options.parse)
        attributes = this.parse(attributes);
      if (defaults = getValue(this, 'defaults')) {
        attributes = _.extend({}, defaults, attributes);
      }
      if (options && options.collection)
        this.collection = options.collection;
      this.attributes = {};
      this._escapedAttributes = {};
      this.cid = _.uniqueId('c');
      if (!this.set(attributes, {silent: true})) {
        throw new Error("Can't create an invalid model");
      }
      delete this._changed;
      this._previousAttributes = _.clone(this.attributes);
      this.initialize.apply(this, arguments);
    };
    _.extend(Backbone.Model.prototype, Backbone.Events, {
      idAttribute: 'id',
      initialize: function() {},
      toJSON: function() {
        return _.clone(this.attributes);
      },
      get: function(attr) {
        return this.attributes[attr];
      },
      escape: function(attr) {
        var html;
        if (html = this._escapedAttributes[attr])
          return html;
        var val = this.attributes[attr];
        return this._escapedAttributes[attr] = _.escape(val == null ? '' : '' + val);
      },
      has: function(attr) {
        return this.attributes[attr] != null;
      },
      set: function(key, value, options) {
        var attrs,
            attr,
            val;
        if (_.isObject(key) || key == null) {
          attrs = key;
          options = value;
        } else {
          attrs = {};
          attrs[key] = value;
        }
        options || (options = {});
        if (!attrs)
          return this;
        if (attrs instanceof Backbone.Model)
          attrs = attrs.attributes;
        if (options.unset)
          for (attr in attrs)
            attrs[attr] = void 0;
        if (!this._validate(attrs, options))
          return false;
        if (this.idAttribute in attrs)
          this.id = attrs[this.idAttribute];
        var now = this.attributes;
        var escaped = this._escapedAttributes;
        var prev = this._previousAttributes || {};
        var alreadySetting = this._setting;
        this._changed || (this._changed = {});
        this._setting = true;
        for (attr in attrs) {
          val = attrs[attr];
          if (!_.isEqual(now[attr], val))
            delete escaped[attr];
          options.unset ? delete now[attr] : now[attr] = val;
          if (this._changing && !_.isEqual(this._changed[attr], val)) {
            this.trigger('change:' + attr, this, val, options);
            this._moreChanges = true;
          }
          delete this._changed[attr];
          if (!_.isEqual(prev[attr], val) || (_.has(now, attr) != _.has(prev, attr))) {
            this._changed[attr] = val;
          }
        }
        if (!alreadySetting) {
          if (!options.silent && this.hasChanged())
            this.change(options);
          this._setting = false;
        }
        return this;
      },
      unset: function(attr, options) {
        (options || (options = {})).unset = true;
        return this.set(attr, null, options);
      },
      clear: function(options) {
        (options || (options = {})).unset = true;
        return this.set(_.clone(this.attributes), options);
      },
      fetch: function(options) {
        options = options ? _.clone(options) : {};
        var model = this;
        var success = options.success;
        options.success = function(resp, status, xhr) {
          if (!model.set(model.parse(resp, xhr), options))
            return false;
          if (success)
            success(model, resp);
        };
        options.error = Backbone.wrapError(options.error, model, options);
        return (this.sync || Backbone.sync).call(this, 'read', this, options);
      },
      save: function(key, value, options) {
        var attrs,
            current;
        if (_.isObject(key) || key == null) {
          attrs = key;
          options = value;
        } else {
          attrs = {};
          attrs[key] = value;
        }
        options = options ? _.clone(options) : {};
        if (options.wait)
          current = _.clone(this.attributes);
        var silentOptions = _.extend({}, options, {silent: true});
        if (attrs && !this.set(attrs, options.wait ? silentOptions : options)) {
          return false;
        }
        var model = this;
        var success = options.success;
        options.success = function(resp, status, xhr) {
          var serverAttrs = model.parse(resp, xhr);
          if (options.wait)
            serverAttrs = _.extend(attrs || {}, serverAttrs);
          if (!model.set(serverAttrs, options))
            return false;
          if (success) {
            success(model, resp);
          } else {
            model.trigger('sync', model, resp, options);
          }
        };
        options.error = Backbone.wrapError(options.error, model, options);
        var method = this.isNew() ? 'create' : 'update';
        var xhr = (this.sync || Backbone.sync).call(this, method, this, options);
        if (options.wait)
          this.set(current, silentOptions);
        return xhr;
      },
      destroy: function(options) {
        options = options ? _.clone(options) : {};
        var model = this;
        var success = options.success;
        var triggerDestroy = function() {
          model.trigger('destroy', model, model.collection, options);
        };
        if (this.isNew())
          return triggerDestroy();
        options.success = function(resp) {
          if (options.wait)
            triggerDestroy();
          if (success) {
            success(model, resp);
          } else {
            model.trigger('sync', model, resp, options);
          }
        };
        options.error = Backbone.wrapError(options.error, model, options);
        var xhr = (this.sync || Backbone.sync).call(this, 'delete', this, options);
        if (!options.wait)
          triggerDestroy();
        return xhr;
      },
      url: function() {
        var base = getValue(this.collection, 'url') || getValue(this, 'urlRoot') || urlError();
        if (this.isNew())
          return base;
        return base + (base.charAt(base.length - 1) == '/' ? '' : '/') + encodeURIComponent(this.id);
      },
      parse: function(resp, xhr) {
        return resp;
      },
      clone: function() {
        return new this.constructor(this.attributes);
      },
      isNew: function() {
        return this.id == null;
      },
      change: function(options) {
        if (this._changing || !this.hasChanged())
          return this;
        this._changing = true;
        this._moreChanges = true;
        for (var attr in this._changed) {
          this.trigger('change:' + attr, this, this._changed[attr], options);
        }
        while (this._moreChanges) {
          this._moreChanges = false;
          this.trigger('change', this, options);
        }
        this._previousAttributes = _.clone(this.attributes);
        delete this._changed;
        this._changing = false;
        return this;
      },
      hasChanged: function(attr) {
        if (!arguments.length)
          return !_.isEmpty(this._changed);
        return this._changed && _.has(this._changed, attr);
      },
      changedAttributes: function(diff) {
        if (!diff)
          return this.hasChanged() ? _.clone(this._changed) : false;
        var val,
            changed = false,
            old = this._previousAttributes;
        for (var attr in diff) {
          if (_.isEqual(old[attr], (val = diff[attr])))
            continue;
          (changed || (changed = {}))[attr] = val;
        }
        return changed;
      },
      previous: function(attr) {
        if (!arguments.length || !this._previousAttributes)
          return null;
        return this._previousAttributes[attr];
      },
      previousAttributes: function() {
        return _.clone(this._previousAttributes);
      },
      isValid: function() {
        return !this.validate(this.attributes);
      },
      _validate: function(attrs, options) {
        if (options.silent || !this.validate)
          return true;
        attrs = _.extend({}, this.attributes, attrs);
        var error = this.validate(attrs, options);
        if (!error)
          return true;
        if (options && options.error) {
          options.error(this, error, options);
        } else {
          this.trigger('error', this, error, options);
        }
        return false;
      }
    });
    Backbone.Collection = function(models, options) {
      options || (options = {});
      if (options.comparator)
        this.comparator = options.comparator;
      this._reset();
      this.initialize.apply(this, arguments);
      if (models)
        this.reset(models, {
          silent: true,
          parse: options.parse
        });
    };
    _.extend(Backbone.Collection.prototype, Backbone.Events, {
      model: Backbone.Model,
      initialize: function() {},
      toJSON: function() {
        return this.map(function(model) {
          return model.toJSON();
        });
      },
      add: function(models, options) {
        var i,
            index,
            length,
            model,
            cid,
            id,
            cids = {},
            ids = {};
        options || (options = {});
        models = _.isArray(models) ? models.slice() : [models];
        for (i = 0, length = models.length; i < length; i++) {
          if (!(model = models[i] = this._prepareModel(models[i], options))) {
            throw new Error("Can't add an invalid model to a collection");
          }
          if (cids[cid = model.cid] || this._byCid[cid] || (((id = model.id) != null) && (ids[id] || this._byId[id]))) {
            throw new Error("Can't add the same model to a collection twice");
          }
          cids[cid] = ids[id] = model;
        }
        for (i = 0; i < length; i++) {
          (model = models[i]).on('all', this._onModelEvent, this);
          this._byCid[model.cid] = model;
          if (model.id != null)
            this._byId[model.id] = model;
        }
        this.length += length;
        index = options.at != null ? options.at : this.models.length;
        splice.apply(this.models, [index, 0].concat(models));
        if (this.comparator)
          this.sort({silent: true});
        if (options.silent)
          return this;
        for (i = 0, length = this.models.length; i < length; i++) {
          if (!cids[(model = this.models[i]).cid])
            continue;
          options.index = i;
          model.trigger('add', model, this, options);
        }
        return this;
      },
      remove: function(models, options) {
        var i,
            l,
            index,
            model;
        options || (options = {});
        models = _.isArray(models) ? models.slice() : [models];
        for (i = 0, l = models.length; i < l; i++) {
          model = this.getByCid(models[i]) || this.get(models[i]);
          if (!model)
            continue;
          delete this._byId[model.id];
          delete this._byCid[model.cid];
          index = this.indexOf(model);
          this.models.splice(index, 1);
          this.length--;
          if (!options.silent) {
            options.index = index;
            model.trigger('remove', model, this, options);
          }
          this._removeReference(model);
        }
        return this;
      },
      get: function(id) {
        if (id == null)
          return null;
        return this._byId[id.id != null ? id.id : id];
      },
      getByCid: function(cid) {
        return cid && this._byCid[cid.cid || cid];
      },
      at: function(index) {
        return this.models[index];
      },
      sort: function(options) {
        options || (options = {});
        if (!this.comparator)
          throw new Error('Cannot sort a set without a comparator');
        var boundComparator = _.bind(this.comparator, this);
        if (this.comparator.length == 1) {
          this.models = this.sortBy(boundComparator);
        } else {
          this.models.sort(boundComparator);
        }
        if (!options.silent)
          this.trigger('reset', this, options);
        return this;
      },
      pluck: function(attr) {
        return _.map(this.models, function(model) {
          return model.get(attr);
        });
      },
      reset: function(models, options) {
        models || (models = []);
        options || (options = {});
        for (var i = 0,
            l = this.models.length; i < l; i++) {
          this._removeReference(this.models[i]);
        }
        this._reset();
        this.add(models, {
          silent: true,
          parse: options.parse
        });
        if (!options.silent)
          this.trigger('reset', this, options);
        return this;
      },
      fetch: function(options) {
        options = options ? _.clone(options) : {};
        if (options.parse === undefined)
          options.parse = true;
        var collection = this;
        var success = options.success;
        options.success = function(resp, status, xhr) {
          collection[options.add ? 'add' : 'reset'](collection.parse(resp, xhr), options);
          if (success)
            success(collection, resp);
        };
        options.error = Backbone.wrapError(options.error, collection, options);
        return (this.sync || Backbone.sync).call(this, 'read', this, options);
      },
      create: function(model, options) {
        var coll = this;
        options = options ? _.clone(options) : {};
        model = this._prepareModel(model, options);
        if (!model)
          return false;
        if (!options.wait)
          coll.add(model, options);
        var success = options.success;
        options.success = function(nextModel, resp, xhr) {
          if (options.wait)
            coll.add(nextModel, options);
          if (success) {
            success(nextModel, resp);
          } else {
            nextModel.trigger('sync', model, resp, options);
          }
        };
        model.save(null, options);
        return model;
      },
      parse: function(resp, xhr) {
        return resp;
      },
      chain: function() {
        return _(this.models).chain();
      },
      _reset: function(options) {
        this.length = 0;
        this.models = [];
        this._byId = {};
        this._byCid = {};
      },
      _prepareModel: function(model, options) {
        if (!(model instanceof Backbone.Model)) {
          var attrs = model;
          options.collection = this;
          model = new this.model(attrs, options);
          if (!model._validate(model.attributes, options))
            model = false;
        } else if (!model.collection) {
          model.collection = this;
        }
        return model;
      },
      _removeReference: function(model) {
        if (this == model.collection) {
          delete model.collection;
        }
        model.off('all', this._onModelEvent, this);
      },
      _onModelEvent: function(ev, model, collection, options) {
        if ((ev == 'add' || ev == 'remove') && collection != this)
          return;
        if (ev == 'destroy') {
          this.remove(model, options);
        }
        if (model && ev === 'change:' + model.idAttribute) {
          delete this._byId[model.previous(model.idAttribute)];
          this._byId[model.id] = model;
        }
        this.trigger.apply(this, arguments);
      }
    });
    var methods = ['forEach', 'each', 'map', 'reduce', 'reduceRight', 'find', 'detect', 'filter', 'select', 'reject', 'every', 'all', 'some', 'any', 'include', 'contains', 'invoke', 'max', 'min', 'sortBy', 'sortedIndex', 'toArray', 'size', 'first', 'initial', 'rest', 'last', 'without', 'indexOf', 'shuffle', 'lastIndexOf', 'isEmpty', 'groupBy'];
    _.each(methods, function(method) {
      Backbone.Collection.prototype[method] = function() {
        return _[method].apply(_, [this.models].concat(_.toArray(arguments)));
      };
    });
    Backbone.Router = function(options) {
      options || (options = {});
      if (options.routes)
        this.routes = options.routes;
      this._bindRoutes();
      this.initialize.apply(this, arguments);
    };
    var namedParam = /:\w+/g;
    var splatParam = /\*\w+/g;
    var escapeRegExp = /[-[\]{}()+?.,\\^$|#\s]/g;
    _.extend(Backbone.Router.prototype, Backbone.Events, {
      initialize: function() {},
      route: function(route, name, callback) {
        Backbone.history || (Backbone.history = new Backbone.History);
        if (!_.isRegExp(route))
          route = this._routeToRegExp(route);
        if (!callback)
          callback = this[name];
        Backbone.history.route(route, _.bind(function(fragment) {
          var args = this._extractParameters(route, fragment);
          callback && callback.apply(this, args);
          this.trigger.apply(this, ['route:' + name].concat(args));
          Backbone.history.trigger('route', this, name, args);
        }, this));
        return this;
      },
      navigate: function(fragment, options) {
        Backbone.history.navigate(fragment, options);
      },
      _bindRoutes: function() {
        if (!this.routes)
          return;
        var routes = [];
        for (var route in this.routes) {
          routes.unshift([route, this.routes[route]]);
        }
        for (var i = 0,
            l = routes.length; i < l; i++) {
          this.route(routes[i][0], routes[i][1], this[routes[i][1]]);
        }
      },
      _routeToRegExp: function(route) {
        route = route.replace(escapeRegExp, '\\$&').replace(namedParam, '([^\/]+)').replace(splatParam, '(.*?)');
        return new RegExp('^' + route + '$');
      },
      _extractParameters: function(route, fragment) {
        return route.exec(fragment).slice(1);
      }
    });
    Backbone.History = function() {
      this.handlers = [];
      _.bindAll(this, 'checkUrl');
    };
    var routeStripper = /^[#\/]/;
    var isExplorer = /msie [\w.]+/;
    var historyStarted = false;
    _.extend(Backbone.History.prototype, Backbone.Events, {
      interval: 50,
      getFragment: function(fragment, forcePushState) {
        if (fragment == null) {
          if (this._hasPushState || forcePushState) {
            fragment = window.location.pathname;
            var search = window.location.search;
            if (search)
              fragment += search;
          } else {
            fragment = window.location.hash;
          }
        }
        fragment = decodeURIComponent(fragment);
        if (!fragment.indexOf(this.options.root))
          fragment = fragment.substr(this.options.root.length);
        return fragment.replace(routeStripper, '');
      },
      start: function(options) {
        if (historyStarted)
          throw new Error("Backbone.history has already been started");
        this.options = _.extend({}, {root: '/'}, this.options, options);
        this._wantsHashChange = this.options.hashChange !== false;
        this._wantsPushState = !!this.options.pushState;
        this._hasPushState = !!(this.options.pushState && window.history && window.history.pushState);
        var fragment = this.getFragment();
        var docMode = document.documentMode;
        var oldIE = (isExplorer.exec(navigator.userAgent.toLowerCase()) && (!docMode || docMode <= 7));
        if (oldIE) {
          this.iframe = $('<iframe src="javascript:0" tabindex="-1" />').hide().appendTo('body')[0].contentWindow;
          this.navigate(fragment);
        }
        if (this._hasPushState) {
          $(window).bind('popstate', this.checkUrl);
        } else if (this._wantsHashChange && ('onhashchange' in window) && !oldIE) {
          $(window).bind('hashchange', this.checkUrl);
        } else if (this._wantsHashChange) {
          this._checkUrlInterval = setInterval(this.checkUrl, this.interval);
        }
        this.fragment = fragment;
        historyStarted = true;
        var loc = window.location;
        var atRoot = loc.pathname == this.options.root;
        if (this._wantsHashChange && this._wantsPushState && !this._hasPushState && !atRoot) {
          this.fragment = this.getFragment(null, true);
          window.location.replace(this.options.root + '#' + this.fragment);
          return true;
        } else if (this._wantsPushState && this._hasPushState && atRoot && loc.hash) {
          this.fragment = loc.hash.replace(routeStripper, '');
          window.history.replaceState({}, document.title, loc.protocol + '//' + loc.host + this.options.root + this.fragment);
        }
        if (!this.options.silent) {
          return this.loadUrl();
        }
      },
      stop: function() {
        $(window).unbind('popstate', this.checkUrl).unbind('hashchange', this.checkUrl);
        clearInterval(this._checkUrlInterval);
        historyStarted = false;
      },
      route: function(route, callback) {
        this.handlers.unshift({
          route: route,
          callback: callback
        });
      },
      checkUrl: function(e) {
        var current = this.getFragment();
        if (current == this.fragment && this.iframe)
          current = this.getFragment(this.iframe.location.hash);
        if (current == this.fragment || current == decodeURIComponent(this.fragment))
          return false;
        if (this.iframe)
          this.navigate(current);
        this.loadUrl() || this.loadUrl(window.location.hash);
      },
      loadUrl: function(fragmentOverride) {
        var fragment = this.fragment = this.getFragment(fragmentOverride);
        var matched = _.any(this.handlers, function(handler) {
          if (handler.route.test(fragment)) {
            handler.callback(fragment);
            return true;
          }
        });
        return matched;
      },
      navigate: function(fragment, options) {
        if (!historyStarted)
          return false;
        if (!options || options === true)
          options = {trigger: options};
        var frag = (fragment || '').replace(routeStripper, '');
        if (this.fragment == frag || this.fragment == decodeURIComponent(frag))
          return;
        if (this._hasPushState) {
          if (frag.indexOf(this.options.root) != 0)
            frag = this.options.root + frag;
          this.fragment = frag;
          window.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, frag);
        } else if (this._wantsHashChange) {
          this.fragment = frag;
          this._updateHash(window.location, frag, options.replace);
          if (this.iframe && (frag != this.getFragment(this.iframe.location.hash))) {
            if (!options.replace)
              this.iframe.document.open().close();
            this._updateHash(this.iframe.location, frag, options.replace);
          }
        } else {
          window.location.assign(this.options.root + fragment);
        }
        if (options.trigger)
          this.loadUrl(fragment);
      },
      _updateHash: function(location, fragment, replace) {
        if (replace) {
          location.replace(location.toString().replace(/(javascript:|#).*$/, '') + '#' + fragment);
        } else {
          location.hash = fragment;
        }
      }
    });
    Backbone.View = function(options) {
      this.cid = _.uniqueId('view');
      this._configure(options || {});
      this._ensureElement();
      this.initialize.apply(this, arguments);
      this.delegateEvents();
    };
    var eventSplitter = /^(\S+)\s*(.*)$/;
    var viewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName'];
    _.extend(Backbone.View.prototype, Backbone.Events, {
      tagName: 'div',
      $: function(selector) {
        return this.$el.find(selector);
      },
      initialize: function() {},
      render: function() {
        return this;
      },
      remove: function() {
        this.$el.remove();
        return this;
      },
      make: function(tagName, attributes, content) {
        var el = document.createElement(tagName);
        if (attributes)
          $(el).attr(attributes);
        if (content)
          $(el).html(content);
        return el;
      },
      setElement: function(element, delegate) {
        this.$el = $(element);
        this.el = this.$el[0];
        if (delegate !== false)
          this.delegateEvents();
        return this;
      },
      delegateEvents: function(events) {
        if (!(events || (events = getValue(this, 'events'))))
          return;
        this.undelegateEvents();
        for (var key in events) {
          var method = events[key];
          if (!_.isFunction(method))
            method = this[events[key]];
          if (!method)
            throw new Error('Event "' + events[key] + '" does not exist');
          var match = key.match(eventSplitter);
          var eventName = match[1],
              selector = match[2];
          method = _.bind(method, this);
          eventName += '.delegateEvents' + this.cid;
          if (selector === '') {
            this.$el.bind(eventName, method);
          } else {
            this.$el.delegate(selector, eventName, method);
          }
        }
      },
      undelegateEvents: function() {
        this.$el.unbind('.delegateEvents' + this.cid);
      },
      _configure: function(options) {
        if (this.options)
          options = _.extend({}, this.options, options);
        for (var i = 0,
            l = viewOptions.length; i < l; i++) {
          var attr = viewOptions[i];
          if (options[attr])
            this[attr] = options[attr];
        }
        this.options = options;
      },
      _ensureElement: function() {
        if (!this.el) {
          var attrs = getValue(this, 'attributes') || {};
          if (this.id)
            attrs.id = this.id;
          if (this.className)
            attrs['class'] = this.className;
          this.setElement(this.make(this.tagName, attrs), false);
        } else {
          this.setElement(this.el, false);
        }
      }
    });
    var extend = function(protoProps, classProps) {
      var child = inherits(this, protoProps, classProps);
      child.extend = this.extend;
      return child;
    };
    Backbone.Model.extend = Backbone.Collection.extend = Backbone.Router.extend = Backbone.View.extend = extend;
    var methodMap = {
      'create': 'POST',
      'update': 'PUT',
      'delete': 'DELETE',
      'read': 'GET'
    };
    Backbone.sync = function(method, model, options) {
      var type = methodMap[method];
      var params = {
        type: type,
        dataType: 'json'
      };
      if (!options.url) {
        params.url = getValue(model, 'url') || urlError();
      }
      if (!options.data && model && (method == 'create' || method == 'update')) {
        params.contentType = 'application/json';
        params.data = JSON.stringify(model.toJSON());
      }
      if (Backbone.emulateJSON) {
        params.contentType = 'application/x-www-form-urlencoded';
        params.data = params.data ? {model: params.data} : {};
      }
      if (Backbone.emulateHTTP) {
        if (type === 'PUT' || type === 'DELETE') {
          if (Backbone.emulateJSON)
            params.data._method = type;
          params.type = 'POST';
          params.beforeSend = function(xhr) {
            xhr.setRequestHeader('X-HTTP-Method-Override', type);
          };
        }
      }
      if (params.type !== 'GET' && !Backbone.emulateJSON) {
        params.processData = false;
      }
      return $.ajax(_.extend(params, options));
    };
    Backbone.wrapError = function(onError, originalModel, options) {
      return function(model, resp) {
        resp = model === originalModel ? resp : model;
        if (onError) {
          onError(originalModel, resp, options);
        } else {
          originalModel.trigger('error', originalModel, resp, options);
        }
      };
    };
    var ctor = function() {};
    var inherits = function(parent, protoProps, staticProps) {
      var child;
      if (protoProps && protoProps.hasOwnProperty('constructor')) {
        child = protoProps.constructor;
      } else {
        child = function() {
          parent.apply(this, arguments);
        };
      }
      _.extend(child, parent);
      ctor.prototype = parent.prototype;
      child.prototype = new ctor();
      if (protoProps)
        _.extend(child.prototype, protoProps);
      if (staticProps)
        _.extend(child, staticProps);
      child.prototype.constructor = child;
      child.__super__ = parent.prototype;
      return child;
    };
    var getValue = function(object, prop) {
      if (!(object && object[prop]))
        return null;
      return _.isFunction(object[prop]) ? object[prop]() : object[prop];
    };
    var urlError = function() {
      throw new Error('A "url" property or function must be specified');
    };
  }).call(this);
})(require('process'));
