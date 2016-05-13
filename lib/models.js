import $ from 'jquery';
import _ from 'underscore';
import Backbone from 'backbone';

export class Applicant extends Backbone.Model {

	constructor() {
		super();
		this.defaults =  {
			firstName: '',
			lastName: '',
			addressOne: '',
			addressTwo: '',
			city: '',
			state: '',
			zipCode: ''
		};
		Backbone.Model.apply(this);
	}

}