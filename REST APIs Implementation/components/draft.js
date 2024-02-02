class Draft{    
    constructor(filmId, reviewerId, reviewDate, rating, review) {
        this.filmId = filmId;
        this.reviewerId = reviewerId;

        if(reviewDate)
            this.reviewDate = reviewDate;
        if(rating)
            this.rating = rating;
        if(review)
            this.review = review;
        
        var selfLink = "/api/films/public/" + this.filmId + "/reviews/" + this.reviewerId + "/draft";
        this.self =  selfLink;
    }
}

module.exports = Draft;


