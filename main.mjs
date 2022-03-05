import { Client, Intents, MessageEmbed } from 'discord.js'
import { hyperlink, roleMention } from '@discordjs/builders'
import { getFirestore, collection, query, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import firebase from './class/firebase'
import { commandConverter } from './class/command';
import { promotionConverter } from './class/promotions'
import { eventConverter } from './class/event'

//----------------------------------------------------------------
// Variables
//----------------------------------------------------------------

let commandList = [];
const db = getFirestore();

//----------------------------------------------------------------
// Check New/Modified/Removed Command
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
// Command Part
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

const live_channel = '946797486792667166';
const title_channel = '946798597406613504';
const category_channel = '946798746879025164';

// When the bot is ready
client.on('ready', (client) => {
  console.log(`Logged in as ${client.user.tag}!`);
  console.log(`Connected on Guilds: ${JSON.stringify(client.guilds)}`);
  client.user.setActivity('surveiller le Paradis !');

  //----------------------------------------------------------------
  // Check New/Modified Promotions
  //----------------------------------------------------------------

  const promotion_channel = '753270574272217109';
  const steamRole = '919305771492200458';
  const epicRole = '919305883815673936';
  const otherRole = '919305976820162560';

  const q2 = query(collection(db, 'promotions').withConverter(promotionConverter));

  const promotionModified = onSnapshot(q2, (snapshot) => {
    snapshot.docChanges().forEach((change) => {

      const data = change.doc.data();

      let role = 0;

      switch(data.ping) {
        case 'steam':
          role = steamRole;
          break;
        case 'epic':
          role = epicRole;
          break;
        case 'autre':
          role = otherRole;
          break;
      }

      switch(change.type) {
        case 'added':

          console.log('A new promotion has been detected: ', data);

          // If the message is already on Discord
          if(data.message_id) return;

          // Send the message
          client.channels.fetch(promotion_channel).then((channel) => {
            channel.send({ content: roleMention(role), embeds: [createPromotionEmbed(data)]} ).then(async (msg) => {

              console.log('Embed message sent to promotion channel');
  
              // We put the message id on Firebase
              const promotionRef = doc(db, 'promotions', data.id);

              await updateDoc(promotionRef, {
                message_id: msg.id
              }).then(() => {
                console.log('message_id sent to Firebase !');
              }).catch((err) => {
                console.log('Error while sending message_id', err);
              })
            })
          }).catch((err) => {
            console.error('Error while fetching promotion channel', err);
          });

          break;
        case 'modified':

          console.log('An edited promotion has been detected: ', data);

          client.channels.fetch(promotion_channel).then((channel) => {
            channel.messages.fetch(data.message_id).then((msg) => {
                msg.edit({ content: roleMention(role), embeds: [createPromotionEmbed(data)]} ).then(() => {
                  console.log(`The message ${data.message_id} in promotion has been successfully edited`);
                }).catch((err) => {
                  console.error('Error while editing message in promotion', err);
                });
            }).catch((err) => {
              console.error('Error while fetching message', err);
            });
          }).catch((err) => {
            console.error('Error while fetching promotion channel', err);
          });

          break;
        case 'removed':
          break;
        default:
          console.log('A promotion not added/modified/removed ?');
          break;
      }

    })
  });

  //----------------------------------------------------------------
  // Check New Events
  //----------------------------------------------------------------

  const q3 = query(collection(db, 'events').withConverter(eventConverter));

  const eventModified = onSnapshot(q3, (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {

      const data = change.doc.data();

      switch(change.type) {
        case 'added':
          // We check what type of event
          switch(data.type) {
            case 'online':
              client.channels.fetch(live_channel).then((channel) => {
                channel.setName('🔴 EN LIGNE').then((editedChannel) => {
                  console.log('The channel has been renamed to online mode');
                }).catch((err) => {
                  console.error('Error while setName for Online', err);
                });
              });
              break;
            case 'offline':
              client.channels.fetch(live_channel).then((channel) => {
                channel.setName('❌ HORS LIGNE').then((editedChannel) => {
                  console.log('The channel has been renamed to offline mode');
                }).catch((err) => {
                  console.error('Error while setName for Offline', err);
                });
              });
              break;
            case 'status':
              client.channels.fetch(title_channel).then((channel) => {
                channel.setName(`✏️ ${data.title}`).then((editedChannel) => {
                  console.log('The channel has been renamed to title mode');
                }).catch((err) => {
                  console.error('Error while setName for Title', err);
                });
              });
              client.channels.fetch(category_channel).then((channel) => {
                channel.setName(`🎮 ${data.category}`).then((editedChannel) => {
                  console.log('The channel has been renamed to category mode');
                }).catch((err) => {
                  console.error('Error while setName for Category', err);
                });
              });
              break;
          }

          // We delete the doc
          await deleteDocument(doc(db, 'events', data.id));

          break;
        default:
          break;
      }

    })
  });

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

function createPromotionEmbed(data) {

  return new MessageEmbed()
  .setColor('RANDOM')
  .setTitle(`${data.name} est actuellement disponible gratuitement sur ${data.platform} !`)
  .setAuthor({ name: 'Angeaple', iconURL: 'https://cdn.discordapp.com/avatars/299581701040898058/17ba9fc5a5fa8cd2aea7f5a9f98fc9af.webp' })
  .setDescription(`L'offre se termine le ${Intl.DateTimeFormat('fr-FR').format(data.end_date.seconds * 1000)} donc foncer tête baissée car il est gratuit`)
  .addField('Le lien :', hyperlink(`${data.platform}`, data.link))
  .setImage(data.url)
  .setTimestamp();
}

