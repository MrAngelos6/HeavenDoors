import { Client, Intents } from 'discord.js';
import { getFirestore, collection, query, onSnapshot } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import express from 'express';
import { commandConverter } from './command.mjs';

//----------------------------------------------------------------
// Firebase Config
//----------------------------------------------------------------

const firebaseConfig = initializeApp({
    apiKey: process.env.API_KEY,
    authDomain: process.env.AUTH_DOMAIN,
    databaseURL: process.env.DATABSE_URL,
    projectId: process.env.PROJECT_ID,
    storageBucket: process.env.STORAGE_BUCKET,
    messagingSenderId: process.env.SENDER_ID,
    appId: process.env.APP_ID
});

//----------------------------------------------------------------
// Variables
//----------------------------------------------------------------

let commandList = [];
const db = getFirestore();

//----------------------------------------------------------------
// Firebase Part
//----------------------------------------------------------------

const q = query(collection(db, 'commands').withConverter(commandConverter));

const commandsModified = onSnapshot(q, (snapshot) => {
  snapshot.docChanges().forEach((change) => {
    
    switch(change.type) {
      case 'added':
        commandList.push(change.doc.data());
        console.log('A command has been added: ', change.doc.data())
        break;
      case 'modified':
        commandList.forEach((cmd) => {
          if(cmd.id === change.doc.data().id) {
            cmd.name = change.doc.data().name;
            cmd.responses = change.doc.data().responses;
            console.log('A command has been modified: ', change.doc.data());
          }
        });
        break;
      case 'removed':
        commandList = commandList.filter((cmd) => cmd.id !== change.doc.data().id);
        console.log('A command has been deleted: ', change.doc.data());
        break;
    }
      
  })
})

//----------------------------------------------------------------
// Discord Part
//----------------------------------------------------------------

// We initialize a Client Object
const client = new Client({ 
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_BANS,
    Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
    Intents.FLAGS.GUILD_INTEGRATIONS,
    Intents.FLAGS.GUILD_WEBHOOKS,
    Intents.FLAGS.GUILD_INVITES,
    Intents.FLAGS.GUILD_VOICE_STATES,
    Intents.FLAGS.GUILD_PRESENCES,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.GUILD_MESSAGE_TYPING,
    Intents.FLAGS.DIRECT_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
    Intents.FLAGS.DIRECT_MESSAGE_TYPING,
    Intents.FLAGS.GUILD_SCHEDULED_EVENTS,
  ],
});

const live_channel = 946797486792667166;
const title_channel = 946798597406613504;
const category_channel = 946798746879025164;

// When the bot is ready
client.on('ready', (client) => {
  console.log(`Logged in as ${client.user.tag}!`);
  console.log(`Connected on ${client.guilds}`)
  client.user.setActivity('surveiller le Paradis !');
});

// When a message is received
client.on('messageCreate', (message) => {
  let msg = message.cleanContent;
  // If it's a bot
  if(!message.author.bot) {
    // If commandList is not empty
    if(commandList.length > 0) {
      // For each commands
      commandList.forEach((cmd) => {        
        // If the message contain the command
        if(msg.toLowerCase().includes(cmd.name.toLowerCase())) {
          // Send a message associated to the command
          const channel = message.channel;
          console.log(`A command has been detected: ${cmd.name} on the channelId: ${channel.id}`)
          channel.send(cmd.getRandomResponse());
        }
      })
    }
  } 
});

// We login to Discord with the TOKEN
client.login(process.env.DISCORD_KEY);

//----------------------------------------------------------------
// Twitch Part
//----------------------------------------------------------------

const app = express();
const port = process.env.PORT || 8080;

// Notification request headers
const TWITCH_MESSAGE_ID = 'Twitch-Eventsub-Message-Id'.toLowerCase();
const TWITCH_MESSAGE_TIMESTAMP = 'Twitch-Eventsub-Message-Timestamp'.toLowerCase();
const TWITCH_MESSAGE_SIGNATURE = 'Twitch-Eventsub-Message-Signature'.toLowerCase();
const MESSAGE_TYPE = 'Twitch-Eventsub-Message-Type'.toLowerCase();

// Notification message types
const MESSAGE_TYPE_VERIFICATION = 'webhook_callback_verification';
const MESSAGE_TYPE_NOTIFICATION = 'notification';
const MESSAGE_TYPE_REVOCATION = 'revocation';

// Prepend this string to the HMAC that's created from the message
const HMAC_PREFIX = 'sha256=';

app.use(express.raw({          // Need raw message body for signature verification
    type: 'application/json'
}))  


app.post('/eventsub', (req, res) => {
    let secret = getSecret();
    let message = getHmacMessage(req);
    let hmac = HMAC_PREFIX + getHmac(secret, message);  // Signature to compare

    if (true === verifyMessage(hmac, req.headers[TWITCH_MESSAGE_SIGNATURE])) {
        console.log("signatures match");

        // Get JSON object from body, so you can process the message.
        let notification = JSON.parse(req.body);
        
        if (MESSAGE_TYPE_NOTIFICATION === req.headers[MESSAGE_TYPE]) {
            // TODO: Do something with the event's data.

            console.log(`Event type: ${notification.subscription.type}`);
            console.log(JSON.stringify(notification.event, null, 4));
            
            res.sendStatus(204);
        }
        else if (MESSAGE_TYPE_VERIFICATION === req.headers[MESSAGE_TYPE]) {
            res.status(200).send(notification.challenge);
        }
        else if (MESSAGE_TYPE_REVOCATION === req.headers[MESSAGE_TYPE]) {
            res.sendStatus(204);

            console.log(`${notification.subscription.type} notifications revoked!`);
            console.log(`reason: ${notification.subscription.status}`);
            console.log(`condition: ${JSON.stringify(notification.subscription.condition, null, 4)}`);
        }
        else {
            res.sendStatus(204);
            console.log(`Unknown message type: ${req.headers[MESSAGE_TYPE]}`);
        }
    }
    else {
        // Signatures didn't match.
        console.log('403'); 
        res.sendStatus(403);
    }
})
  
app.listen(port, () => {
  console.log(`HeavenDoors app listening at https://mrangelos6-discord-bot.herokuapp.com/ with port:${port}`);
})


function getSecret() {
    return process.env.TWITCH_SECRET;
}

// Build the message used to get the HMAC.
function getHmacMessage(request) {
    return (request.headers[TWITCH_MESSAGE_ID] + 
        request.headers[TWITCH_MESSAGE_TIMESTAMP] + 
        request.body);
}

// Get the HMAC.
function getHmac(secret, message) {
    return crypto.createHmac('sha256', secret)
    .update(message)
    .digest('hex');
}

// Verify whether our hash matches the hash that Twitch passed in the header.
function verifyMessage(hmac, verifySignature) {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(verifySignature));
}