class Command {

    /**
     * Represents a command
     * @param {String} name 
     * @param {Array} responses
     * @constructor 
     */
    constructor(id, name, responses) {
        this.id = id;
        this.name = name;
        this.responses = responses;
    }
    
    /**
     * Get random int that represents a response in the responses list
     * @returns {String} Random response
     */
    getRandomResponse() {
      return this.responses[Math.floor(Math.random() * this.responses.length)];
    }
}

export const commandConverter = {
    toFirestore: (command) => {
        return {
            name: command.name,
            responses:command.responses
        };
    },
    fromFirestore: (snapshot, options) => {
        const data = snapshot.data(options);
        return new Command(snapshot.id, data.name, data.responses);
    }
}
