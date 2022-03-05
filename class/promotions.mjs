export class Promotion {

    /**
     * Represents a promotion
     * @param {String} name 
     * @param {String} platform
     * @param {String} link
     * @param {String} ping
     * @param {Date} end_date
     * @param {String} url
     * @param {Number} message_id
     * @constructor 
     */
    constructor(id, name, platform, link, ping, end_date, url, message_id) {
        this.id = id;
        this.name = name;
        this.platform = platform;
        this.link = link;
        this.ping = ping;
        this.end_date = end_date;
        this.url = url;
        this.message_id = message_id;
    }
}

export const promotionConverter = {
    toFirestore: (promotion) => {
        return {
            name: promotion.name,
            platform: promotion.platform,
            link: promotion.link,
            ping: promotion.ping,
            end_date: promotion.end_date,
            url: promotion.url,
            message_id: promotion.message_id
        };
    },
    fromFirestore: (snapshot, options) => {
        const data = snapshot.data(options);
        return new Promotion(snapshot.id, data.name, data.platform, data.link, data.ping, data.end_date, data.url, data.message_id);
    }
}