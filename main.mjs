import { Client, Intents } from 'discord.js';
import { getFirestore, collection, query, onSnapshot } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { commandConverter } from './command.mjs';

//----------------------------------------------------------------
// Server <-> Worker
//----------------------------------------------------------------

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
  console.log(`Connected on Guilds: ${JSON.stringify(client.guilds)}`);
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
 