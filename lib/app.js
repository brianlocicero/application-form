import $ from 'jquery';
import _ from 'underscore';
import Backbone from 'backbone';
import {Applicant} from 'lib/models.js';
import {ApplicantNameView, ApplicantAddressView, ApplicantThankYouView} from 'lib/views.js';
import {SetupEvents} from 'lib/events.js';

//model
var applicant = new Applicant;

//views
var applicantNameView = new ApplicantNameView({model:applicant});
var applicantAddressView = new ApplicantAddressView({model:applicant});
var applicantThankYouView = new ApplicantThankYouView({model:applicant});

//render
$('.main-content').append( applicantNameView.$el );

//button events
SetupEvents(applicant, [applicantNameView, applicantAddressView, applicantThankYouView]);


