[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-24ddc0f5d75046c5622901739e7c5dd533143b0c8e959d652212380cedb1ea36.svg)](https://classroom.github.com/a/3V4SFed_)
# Exam Call 1

The structure of this repository is the following:
  - "JSON Schemas" contains the design of the JSON Schemas;
  - "REST APIs Design" contains the full Open API documentation of the REST APIs, including examples of JSON documents to be used when invoking the operations, and examples of invocations of the API operations, possibly as a Postman collection;
  - "REST APIs Implementation" contains the code of the Film Manager service application.

  ## Design choices

  1. In order to allow the partial modification of a review, I updated the "updateSingleReview" function. Before allowing the update of the "completed" property, the function checks if all the review properties (reviewDate, rating, review) have been setted.

  2. In order to allow the delegation of a review, I started by updating the database "reviews" table by adding two new columns called "delegateId" and "delegated". The "delegated" column is set to 1 (True) if the row is a delegated review. The "delegateId" is the ID of the user who received the delegation. The "delegateId", together with the "filmId" and the "reviewerId" are the primary key. 

    Since there are no constraints about it, I decided to allow an user to write more than 1 review for the same Film. This means for example, if user A and B are issued for the review of Film F1, and B decides to delegate the review of Film F1 to A, this is allowed.

  3. Every time a user decides to delegate a review, after the proper checks, a new row is created in the "reviews" table. This new row has as the same fields (filmId, reviewerId, reviewDate, rating, review) of the original review. The "delegateId" of the new row gets setted to the ID of the delegated user and also the "delegated" field gets setted to 1 (True). After the insert, a Trigger inside the database updates the "delegated" field of the original review by setting it to 1 (True).

    Example:
    User 1 wants to delegate review of Film 1 to User 2

    filmId  reviewerId  delegateId  delegated   other-fields
      1        1           1           1            //
      1        1           2           1            //

  4. Starting from this point, the only user allowed to update the review is the delegated user. After an update, the row associated to the delegated review is updated, but the original one is not modified. In this way the original review is stored in case the delegator of the review decides to delete the delegation and return to the original review.

  5. When a delegation is deleted, after the proper checks, the delegated review is deleted from the database. After the delete, a Trigger inside the database updates the "delegated" field of the original review by setting it to 1 (False).