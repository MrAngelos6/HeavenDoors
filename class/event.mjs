class Event {

    /**
     * Represents an event
     * @param {String} type 
     * @param {String} category
     * @constructor 
     */
    constructor(id, type, category) {
        this.id = id;
        this.type = type;
        this.category = category;
    }
    
}

export const eventConverter = {
    toFirestore: (event) => {
        return {
            type: event.type,
            category: event.category
        };
    },
    fromFirestore: (snapshot, options) => {
        const data = snapshot.data(options);
        return new Command(snapshot.id, data.type, data.category);
    }
}
