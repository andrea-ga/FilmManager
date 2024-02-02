'use strict';

var utils = require('../utils/writer.js');
var Drafts = require('../service/DraftsService');

module.exports.getSingleReviewDraft = function getSingleReviewDraft (req, res, next) {

    if(req.params.reviewerId != req.user.id)
    {
      utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The reviewerId is not equal the id of the requesting user.' }], }, 400);
    }
    else {
      Drafts.getSingleReviewDraft(req.params.filmId, req.params.reviewerId)
          .then(function(response) {
              utils.writeJson(res, response);
          })
          .catch(function(response) {
              if(response == 403){
                utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user is not a reviewer of the film' }], }, 403);
              }
              else if (response == 404){
                  utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The review draft does not exist.' }], }, 404);
              }
              else {
                  utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
              }
          });
    }
};


module.exports.updateSingleReviewDraft = function updateSingleReviewDraft (req, res, next) {
  
  if(req.params.reviewerId != req.user.id)
  {
    utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The reviewerId is not equal the id of the requesting user.' }], }, 400);
  }
  else {
    Drafts.updateSingleReviewDraft(req.body, req.params.filmId, req.params.reviewerId)
    .then(function(response) {
        utils.writeJson(res, response, 204);
    })
    .catch(function(response) {
        if(response == 403){
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user is not a reviewer of the film' }], }, 403);
        }
        else if (response == 404){
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The review draft does not exist.' }], }, 404);
        }
        else {
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
        }
    });
  }
};

