'use strict';

const Review = require('../components/review');
const User = require('../components/user');
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
      var sql = "SELECT r.filmId as fid, r.reviewerId as rid, delegatorId, delegateId, completed, reviewDate, rating, review, c.total_rows FROM reviews r, (SELECT count(*) total_rows FROM reviews l WHERE l.filmId = ? AND l.delegateID IS NULL) c WHERE  r.filmId = ? AND r.delegateID IS NULL";
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
      var sqlNumOfReviews = "SELECT count(*) total FROM reviews WHERE filmId = ? AND delegateId IS NULL";
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
      const sql = "SELECT filmId as fid, reviewerId as rid, delegateId, delegatorId, completed, reviewDate, rating, review FROM reviews WHERE filmId = ? AND reviewerId = ?";
      db.all(sql, [filmId, reviewerId], (err, rows) => {
          if (err)
              reject(err);
          else if (rows.length === 0)
              reject(404);
          else {
              if (rows[0].delegateId != null) {
                var delegateId = rows[0].delegateId;
                const sql2 = "SELECT filmId as fid, reviewerId as rid, delegateId, delegatorId, completed, reviewDate, rating, review FROM reviews WHERE filmId = ? AND reviewerId = ?";
                db.all(sql2, [filmId, delegateId], (err, rows) => {
                    if (err)
                        reject(err);
                    else if (rows.length == 0)
                        reject(404);
                    else {
                        var review = createReview(rows[0]);
                        resolve(review);
                    }
                });
              }
              else {
                var review = createReview(rows[0]);
                resolve(review);
              }
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
              const sql2 = 'DELETE FROM reviews WHERE filmId = ? AND (reviewerId = ? OR delegatorId = ?)';
              db.run(sql2, [filmId, reviewerId, reviewerId], (err) => {
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
                    const sql3 = 'INSERT INTO reviews(filmId, reviewerId, completed) VALUES(?,?,0)';
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
        db.run(sql3, [filmId, reviewerId], function(err) {
            if (err) {
                reject('500');
            } else {
                var createdReview = new Review(filmId, reviewerId, false);
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
 * Output:
 * - no response expected for this operation
 * 
 **/
 exports.updateSingleReview = function(review, filmId, reviewerId) {
  return new Promise((resolve, reject) => {

      const sql1 = "SELECT * FROM reviews WHERE filmId = ? AND reviewerId = ?";
      db.all(sql1, [filmId, reviewerId], (err, rows) => {
          if (err)
              reject(err);
          else if (rows.length === 0)
              reject(404);
          else if(reviewerId != rows[0].reviewerId) {
              reject(403);
          }
          else if(rows[0].completed != undefined && rows[0].completed == true) {
              reject(409);
          }
          else if(rows[0].delegateId != undefined) {
              reject(403);
          }
          else {
            var sql2 = 'UPDATE reviews SET ';
            var parameters = [];
            if(review.completed != undefined){
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


/**
 * Delegate a review
 *
 * Input:
 * - review: review object (with only the needed properties)
 * - filmID: the ID of the film to be reviewed
 * - reviewerId: the ID of the reviewer
 * - delegateId: the ID of the delegate
 * Output:
 * - no response expected for this operation
 * 
 **/
exports.delegateReview = function(review, filmId, reviewerId) {
    return new Promise((resolve, reject) => {
  
        const sql1 = "SELECT * FROM reviews WHERE filmId = ? AND reviewerId = ?";
        db.all(sql1, [filmId, reviewerId], (err, rows) => {
            if (err)
                reject(err);
            else if (rows.length === 0)
                reject(404);
            else if(reviewerId != rows[0].reviewerId) {
                reject(403);
            }
            else if(rows[0].completed != undefined && rows[0].completed == true) {
                reject(409);
            }
            else if(rows[0].delegateId != undefined || rows[0].delegatorId != undefined) {
                reject(403);
            }
            else {
              if (review.delegateId != undefined) {
                var sql2 = 'UPDATE reviews SET delegateId = ? WHERE filmId = ? AND reviewerId = ?';

                db.run(sql2, [review.delegateId, filmId, reviewerId], function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        var sql3 = 'SELECT * FROM reviews WHERE filmId = ? AND reviewerId = ?';
                        
                        db.all(sql3, [filmId, review.delegateId], (err, rows) => {
                            if (err) {
                                reject(err);
                            } else {
                                if (rows.length === 0) {
                                    var sql4 = 'INSERT INTO reviews(filmId, reviewerId, delegatorId, completed) VALUES(?,?,?,0)'

                                    db.run(sql4, [filmId, review.delegateId, reviewerId], function(err) {
                                        if (err) {
                                            reject(err);
                                        } else {
                                            resolve(null);
                                        }
                                    });
                                }
                                else {
                                    var sql4 = 'UPDATE reviews SET delegatorId = ? WHERE filmId = ? AND reviewerId = ?'

                                    db.run(sql4, [reviewerId, review.delegateId], function(err) {
                                        if (err) {
                                            reject(err);
                                        } else {
                                            resolve(null);
                                        }
                                    });
                                }

                                resolve(null);
                            }
                        });

                        resolve(null);
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
 * - delegateId : ID of user who wants to remove the review
 * Output:
 * - no response expected for this operation
 * 
 **/
exports.deleteDelegation = function(filmId, reviewerId, invitedUser) {
    return new Promise((resolve, reject) => {
        const sql1 = "SELECT completed, delegateId FROM reviews WHERE filmId = ? AND reviewerId = ? AND delegatorId IS NULL";
        
        db.all(sql1, [filmId, reviewerId], (err, rows) => {
            if (err)
                reject(err);
            else if (rows.length === 0)
                reject(404);
            else if(reviewerId != invitedUser) {
                reject("403");
            }
            else if(rows[0].completed == 1) {
                reject("409");
            }
            else {
                const sql2 = 'DELETE FROM reviews WHERE filmId = ? AND reviewerId = ?';
                
                db.run(sql2, [filmId, rows[0].delegateId], (err) => {
                    if (err)
                        reject(err);
                    else {
                        const sql3 = 'UPDATE reviews SET delegateId = NULL WHERE filmId = ? AND reviewerId = ?';
                        
                        db.run(sql3, [filmId, reviewerId], (err) => {
                            if (err)
                                reject(err);
                            else {
                                resolve(null);
                            }
                        });

                        resolve(null);
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
  return new Review(row.fid, row.rid, row.delegatorId, row.delegateId, completedReview, row.reviewDate, row.rating, row.review);
}
