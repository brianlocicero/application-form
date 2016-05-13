import $ from 'jquery';
import _ from 'underscore';
import Backbone from 'backbone';

export var SetupEvents = function (applicant, views) {

	let myApplicant = applicant;

	function onNext () {
		$('#nextpage').on('click', function(e) {
			var myFirstName = $('#fname').val(),
			myLastName = $('#lname').val();
			myApplicant.set({firstName: myFirstName, lastName: myLastName});
			$('.main-content').empty();
			$('.main-content').append( views[1].$el );
			onFinish();
		});
	}

	function onFinish() {
		$('#complete').on('click', function(e) {
			var myAddressOne = $('#addOne').val(),
			myAddressTwo = $('#addTwo').val(),
			myCity = $('#city').val(),
			myState = $('#state').val(),
			myZipCode = $('#zipcode').val();
			myApplicant.set({
				addressOne: myAddressOne,
				addressTwo: myAddressTwo,
				city: myCity,
				state: myState,
				zipCode: myZipCode
			});
			$('.main-content').empty();
			$('.main-content').append( views[2].$el );
			onRestart();
		});
	}

	function onRestart() {
		$('#restart').on('click', function(e) {
			$('.main-content').empty();
			$('.main-content').append( views[0].$el );
			onNext();
		});
	}

	//start
	onNext();


};
