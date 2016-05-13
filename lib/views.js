import $ from 'jquery';
import _ from 'underscore';
import Backbone from 'backbone';

export class ApplicantNameView extends Backbone.View {
	constructor(options) {
		super();
		this.tagName = 'div';
		this.className = 'nameView';
		this.template = _.template( $('#nameTemplate').html() );
		this.initialize = function () {
			this.render();
			this.listenTo(options.model, 'change', this.render);
		};
		this.render = function () {
			this.$el.html( this.template( options.model.toJSON() ) );
		}
		Backbone.View.apply(this);
	}
}

export class ApplicantAddressView extends Backbone.View {
	constructor(options) {
		super();
		this.tagName = 'div';
		this.className = 'addressView';
		this.template = _.template( $('#addressTemplate').html() );
		this.initialize = function () {
			this.render();
			this.listenTo(options.model, 'change', this.render);
		};
		this.render = function () {
			this.$el.html( this.template( options.model.toJSON() ) );
		}
		Backbone.View.apply(this);
	}
}

export class ApplicantThankYouView extends Backbone.View {
	constructor(options) {
		super();
		this.tagName = 'div';
		this.className = 'thankYouView';
		this.template = _.template( $('#thankYouTemplate').html() );
		this.initialize = function () {
			this.render();
			this.listenTo(options.model, 'change', this.render);
		};
		this.render = function () {
			this.$el.html( this.template( options.model.attributes ) );
		}
		Backbone.View.apply(this);
	}
}

/*
var ApplicantNameView = Backbone.View.extend({
	tagName: 'div',
	className: 'nameView',
	template: _.template( $('#nameTemplate').html() ),
	initialize: function () {
		this.render();
	},
	render: function() {
		this.$el.html( this.template( this.model.toJSON() ) );
	}
});

var ApplicantAddressView = Backbone.View.extend({
	tagName: 'div',
	className: 'addressView',
	template: _.template( $('#addressTemplate').html() ),
	initialize: function () {
		this.render();
	},
	render: function() {
		this.$el.html( this.template( this.model.toJSON() ) );
	}
});
*/