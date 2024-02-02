'use strict';

const Draft = require('../components/draft');
const db = require('../components/db');


/**
 * Retrieve the review of the film having filmId as ID and issued to user with reviewerId as ID
 *
 * Input: 
 * - filmId: the ID of the film whose review needs to be retrieved
 * - reviewerId: the ID ot the reviewer
 * Output:
 * - the requested review
 * 
 **/
exports.getSingleReviewDraft = function(filmId, reviewerId) {
    return new Promise((resolve, reject) => {
        const sql = "SELECT filmId as fid, reviewerId as rid, reviewDate, rating, review FROM drafts WHERE filmId = ? AND reviewerId = ?";
        db.all(sql, [filmId, reviewerId], (err, rows) => {
            if (err)
                reject(err);
            else if (rows.length === 0)
                reject(404);
            else if(reviewerId != rows[0].rid) {
                reject(403);
            }
            else {
                var draft = createDraft(rows[0]);
                resolve(draft);
            }
        });
    });
  }


/**
 * Update a review draft
 *
 * Input:
 * - review: review object (with only the needed properties)
 * - filmID: the ID of the film to be reviewed
 * - reviewerId: the ID of the reviewer
 * Output:
 * - no response expected for this operation
 * 
 **/
exports.updateSingleReviewDraft = function(draft, filmId, reviewerId) {
    return new Promise((resolve, reject) => {
  
        const sql1 = "SELECT * FROM drafts WHERE filmId = ? AND reviewerId = ?";
        db.all(sql1, [filmId, reviewerId], (err, rows) => {
            if (err)
                reject(err);
            else if (rows.length === 0)
                reject(404);
            else if(reviewerId != rows[0].reviewerId) {
                reject(403);
            }
            else {
              var sql2 = 'UPDATE drafts SET ';
              var parameters = [];
              if(draft.reviewDate != undefined){
                    if (parameters.length != 0)
                        sql2 = sql2.concat(', ');
                    sql2 = sql2.concat('reviewDate = ?');
                    parameters.push(draft.reviewDate);
              } 
              if(draft.rating != undefined){
                    if (parameters.length != 0)
                        sql2 = sql2.concat(', ');
                    sql2 = sql2.concat('rating = ?');
                    parameters.push(draft.rating);
              } 
              if(draft.review != undefined){
                    if (parameters.length != 0)
                        sql2 = sql2.concat(', ');
                    sql2 = sql2.concat('review = ?');
                    parameters.push(draft.review);
              } 
              sql2 = sql2.concat(' WHERE filmId = ? AND reviewerId = ?');
              parameters.push(filmId);
              parameters.push(reviewerId);
  
              db.run(sql2, parameters, function(err) {
                if (err) {
                reject(err);
                } else {
                resolve(null);
              }
             })
            }
        });
    });
  }


const createDraft = function(row) {
    return new Draft(row.fid, row.rid, row.reviewDate, row.rating, row.review);
}