class Event {

    /**
     * Represents an event
     * @param {String} type
     * @param {String} title
     * @param {String} category
     * @constructor 
     */
    constructor(id, type, title, category) {
        this.id = id;
        this.type = type;
        this.title = title;
        this.category = category;
    }
    
}

export const eventConverter = {
    toFirestore: (event) => {
        return {
            type: event.type,
            title: event.title,
            category: event.category
        };
    },
    fromFirestore: (snapshot, options) => {
        const data = snapshot.data(options);
        return new Command(snapshot.id, data.type, data.title, data.category);
    }
}
