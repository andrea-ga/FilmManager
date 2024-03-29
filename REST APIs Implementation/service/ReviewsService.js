'use strict';

const Review = require('../components/review');
const db = require('../components/db');
var constants = require('../utils/constants.js');


/**
 * Retrieve the reviews of the film with ID filmId
 * 
 * Input: 
 * - req: the request of the user
 * Output:
 * - list of the reviews
 * 
 **/
 exports.getFilmReviews = function(req) {
  return new Promise((resolve, reject) => {
      var sql = "SELECT r.filmId as fid, r.reviewerId as rid, delegateId, delegated, completed, reviewDate, rating, review, c.total_rows FROM reviews r, (SELECT count(*) total_rows FROM reviews l WHERE l.filmId = ? AND l.delegateId = l.reviewerId) c WHERE  r.filmId = ? AND ((r.delegateId = r.reviewerId AND r.delegated = 0) OR r.delegateId != r.reviewerId)";
      var params = getPagination(req);
      if (params.length != 2) sql = sql + " LIMIT ?,?";
      db.all(sql, params, (err, rows) => {
          if (err) {
              reject(err);
          } else {
              let reviews = rows.map((row) => createReview(row));
              resolve(reviews);
          }
      });
  });
}

/**
 * Retrieve the number of reviews of the film with ID filmId
 * 
 * Input: 
* - filmId: the ID of the film whose reviews need to be retrieved
 * Output:
 * - total number of reviews of the film with ID filmId
 * 
 **/
 exports.getFilmReviewsTotal = function(filmId) {
  return new Promise((resolve, reject) => {
      var sqlNumOfReviews = "SELECT count(*) total FROM reviews WHERE filmId = ? AND delegateId = reviewerId";
      db.get(sqlNumOfReviews, [filmId], (err, size) => {
          if (err) {
              reject(err);
          } else {
              resolve(size.total);
          }
      });
  });
}



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
 exports.getSingleReview = function(filmId, reviewerId) {
  return new Promise((resolve, reject) => {
      const sql = "SELECT filmId as fid, reviewerId as rid, delegateId, delegated, completed, reviewDate, rating, review FROM reviews WHERE filmId = ? AND reviewerId = ? AND ((reviewerId = delegateId AND delegated = 0) OR reviewerId != delegateId)";
      db.all(sql, [filmId, reviewerId], (err, rows) => {
          if (err)
              reject(err);
          else if (rows.length === 0)
              reject(404);
          else {
              var review = createReview(rows[0]);
              resolve(review);
          }
      });
  });
}


/**
 * Delete a review invitation
 *
 * Input: 
 * - filmId: ID of the film
 * - reviewerId: ID of the reviewer
 * - owner : ID of user who wants to remove the review
 * Output:
 * - no response expected for this operation
 * 
 **/
 exports.deleteSingleReview = function(filmId,reviewerId,owner) {
  return new Promise((resolve, reject) => {
      const sql1 = "SELECT f.owner, r.completed FROM films f, reviews r WHERE f.id = r.filmId AND f.id = ? AND r.reviewerId = ?";
      db.all(sql1, [filmId, reviewerId], (err, rows) => {
          if (err)
              reject(err);
          else if (rows.length === 0)
              reject(404);
          else if(owner != rows[0].owner) {
              reject("403");
          }
          else if(rows[0].completed == 1) {
              reject("409");
          }
          else {
              const sql2 = 'DELETE FROM reviews WHERE filmId = ? AND reviewerId = ?';
              db.run(sql2, [filmId, reviewerId], (err) => {
                  if (err)
                      reject(err);
                  else
                      resolve(null);
              })
          }
      });
  });

}


/**
 * Issue a film review to a user
 *
 *
 * Input: 
 * - reviewerId : ID of the film reviewer
 * - filmId: ID of the film 
 * - owner: ID of the user who wants to issue the review
 * Output:
 * - no response expected for this operation
 * 
 **/
 exports.issueFilmReview = function(invitations,owner) {
    console.log(invitations)
  return new Promise((resolve, reject) => {
      const sql1 = "SELECT owner, private FROM films WHERE id = ?";
      db.all(sql1, [invitations[0].filmId], (err, rows) => {
          if (err){
                reject(err);
          }
          else if (rows.length === 0){
              reject(404);
          }
          else if(owner != rows[0].owner) {
              reject(403);
          } else if(rows[0].private == 1) {
              reject(404);
          }
          else {
            var sql2 = 'SELECT * FROM users' ;
            var invitedUsers = [];
            for (var i = 0; i < invitations.length; i++) {
                console.log(invitations[i]);
                if(i == 0) sql2 += ' WHERE id = ?';
                else sql2 += ' OR id = ?'
                invitedUsers[i] = invitations[i].reviewerId;
            }
            db.all(sql2, invitedUsers, async function(err, rows) {
                if (err) {
                    reject(err);
                } 
                else if (rows.length !== invitations.length){
                    reject(409);
                }
                else {
                    const sql3 = 'INSERT INTO reviews(filmId, reviewerId, delegateId, delegated, completed) VALUES(?,?,?,0,0)';
                    var finalResult = [];
                    for (var i = 0; i < invitations.length; i++) {
                        var singleResult;
                        try {
                            singleResult = await issueSingleReview(sql3, invitations[i].filmId, invitations[i].reviewerId);
                            finalResult[i] = singleResult;
                        } catch (error) {
                            reject ('Error in the creation of the review data structure');
                            break;
                        }
                    }

                    if(finalResult.length !== 0){
                        resolve(finalResult);
                    }        
                }
            }); 
          }
      });
  });
}

const issueSingleReview = function(sql3, filmId, reviewerId){
    return new Promise((resolve, reject) => {
        db.run(sql3, [filmId, reviewerId, reviewerId], function(err) {
            if (err) {
                reject('500');
            } else {
                var createdReview = new Review(filmId, reviewerId, reviewerId, delegated=false, completed=false);
                resolve(createdReview);
            }
        });
    })
}

/**
 * Update a review
 *
 * Input:
 * - review: review object (with only the needed properties)
 * - filmID: the ID of the film to be reviewed
 * - reviewerId: the ID of the reviewer
 * - logUser: ID of the user who wants to update the review
 * Output:
 * - no response expected for this operation
 * 
 **/
 exports.updateSingleReview = function(review, filmId, reviewerId, logUser) {
  return new Promise((resolve, reject) => {

      const sql1 = "SELECT * FROM reviews WHERE filmId = ? AND reviewerId = ? AND ((reviewerId = delegateId AND delegated = 0) OR (reviewerId != delegateId AND delegated = 1))";
      db.all(sql1, [filmId, reviewerId], (err, rows) => {
          if (err)
              reject(err);
          else if (rows.length === 0)
              reject(404);
          else if(rows[0].delegateId != logUser) {
                reject(403);
          }
          else if(rows[0].completed != undefined && rows[0].completed == true) {
              reject(409);
          }
          else {
            var sql2 = 'UPDATE reviews SET ';
            var parameters = [];
            if(review.completed != undefined){
                if (review.completed === 1 && ((review.reviewDate == undefined && rows[0].reviewDate == undefined) ||
                                               (review.rating == undefined && rows[0].rating == undefined) ||
                                               (review.review == undefined && rows[0].review == undefined))) {
                    reject(409);
                }

                if (parameters.length != 0)
                      sql2 = sql2.concat(', ');  
                sql2 = sql2.concat('completed = ?');
                parameters.push(review.completed);
            } 
            if(review.reviewDate != undefined){
              if (parameters.length != 0)
                    sql2 = sql2.concat(', ');  
              sql2 = sql2.concat('reviewDate = ?');
              parameters.push(review.reviewDate);
            } 
            if(review.rating != undefined){
                if (parameters.length != 0)
                    sql2 = sql2.concat(', ');
                sql2 = sql2.concat('rating = ?');
                parameters.push(review.rating);
            }
            if(review.review != undefined){
                if (parameters.length != 0)
                    sql2 = sql2.concat(', ');
                sql2 = sql2.concat('review = ?');
                parameters.push(review.review);
            } 
            sql2 = sql2.concat(' WHERE filmId = ? AND reviewerId = ? AND delegateId = ?');
            parameters.push(filmId);
            parameters.push(rows[0].reviewerId);
            parameters.push(rows[0].delegateId);

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


/**
 * Delegate a review
 *
 * Input:
 * - review: review object (with only the needed properties)
 * - filmID: the ID of the film to be reviewed
 * - reviewerId: the ID of the reviewer
 * Output:
 * - the delegated review
 * 
 **/
exports.delegateReview = function(review, filmId, reviewerId) {
    return new Promise((resolve, reject) => {
  
        const sql1 = "SELECT * FROM reviews WHERE filmId = ? AND reviewerId = ?";
        var r_date = null;
        var ra = null;
        var re = null;
        db.all(sql1, [filmId, reviewerId], (err, rows) => {
            if (err)
                reject(err);
            else if (rows.length === 0)
                reject(404);
            else if (rows.length > 1)
                reject(409);
            else if(rows[0].completed != undefined && rows[0].completed == true) {
                reject(409);
            }
            else {
              r_date = rows[0].reviewDate;
              ra = rows[0].rating;
              re = rows[0].review;
            
              if (review.delegateId != undefined) {
                    const sql2 = 'INSERT INTO reviews(filmId, reviewerId, delegateId, delegated, completed, reviewDate, rating, review) VALUES(?,?,?,1,0,?,?,?)';
                    
                    db.run(sql2, [filmId, reviewerId, review.delegateId, r_date, ra, re], function(err) {
                        if (err) {
                            reject(err);
                        }
                        else {
                            const sql3 = 'UPDATE reviews SET delegated = ? WHERE filmId = ? AND reviewerId = ? AND delegateId = ?';

                            db.run(sql3, [1, filmId, reviewerId, reviewerId], function(err) {
                                if(err) {
                                    reject(err);
                                }
                                else {
                                    var row = {fid: filmId, rid: reviewerId, delegateId: review.delegateId, delegated: 1, completed: 0, reviewDate: r_date, rating: ra, review: re};
                                    var rev = createReview(row);
                                    resolve(rev);
                                }
                            })
                        }
                    });
                }
            }
        });
    });
}


/**
 * Delete a delegation
 *
 * Input: 
 * - filmId: ID of the film
 * - reviewerId: ID of the reviewer
 * - logUser : ID of user who wants to remove the review
 * Output:
 * - no response expected for this operation
 * 
 **/
exports.deleteDelegation = function(filmId, reviewerId, logUser) {
    return new Promise((resolve, reject) => {
        const sql1 = "SELECT completed, delegateId FROM reviews WHERE filmId = ? AND delegateId != ?";
        
        db.all(sql1, [filmId, reviewerId], (err, rows) => {
            if (err)
                reject(err);
            else if (rows.length === 0)
                reject(404);
            else if(logUser != reviewerId) {
                reject("403");
            }
            else if(rows[0].completed === 1) {
                reject("409");
            }
            else {
                const sql2 = 'DELETE FROM reviews WHERE filmId = ? AND reviewerId = ? AND delegateId = ?';
                
                db.run(sql2, [filmId, reviewerId, rows[0].delegateId], (err) => {
                    if (err)
                        reject(err);
                    else {
                        const sql3 = 'UPDATE reviews SET delegated = ? WHERE filmId = ? AND reviewerId = ? AND delegateId = ?'

                        db.run(sql3, [0, filmId, reviewerId, reviewerId], (err) => {
                            if(err)
                                reject(err);
                            else
                                resolve(null);
                        })
                    }
                });
            }
        });
    });
  
  }


/**
 * Utility functions
 */
 const getPagination = function(req) {
  var pageNo = parseInt(req.query.pageNo);
  var size = parseInt(constants.OFFSET);
  var limits = [];
  limits.push(req.params.filmId);
  limits.push(req.params.filmId);
  if (req.query.pageNo == null) {
      pageNo = 1;
  }
  limits.push(size * (pageNo - 1));
  limits.push(size);
  return limits;
}


const createReview = function(row) {
  var completedReview = (row.completed === 1) ? true : false;
  var delegatedReview = (row.delegated === 1) ? true : false;
  return new Review(row.fid, row.rid, row.delegateId, delegatedReview, completedReview, row.reviewDate, row.rating, row.review);
}
