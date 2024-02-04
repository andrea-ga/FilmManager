class Review{    
    constructor(filmId, reviewerId, completed, delegatorId, delegateId, reviewDate, rating, review) {
        this.filmId = filmId;
        this.reviewerId = reviewerId;
        this.completed = completed;
        
        if(delegatorId)
            this.delegatorId = delegatorId;
        if(delegateId)
            this.delegateId = delegateId;
        if(reviewDate)
            this.reviewDate = reviewDate;
        if(rating)
            this.rating = rating;
        if(review)
            this.review = review;
        
        var selfLink = "/api/films/public/" + this.filmId + "/reviews/" + this.reviewerId;
        this.self =  selfLink;
    }
}

module.exports = Review;


