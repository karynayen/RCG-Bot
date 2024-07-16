const { App } = require('@slack/bolt');
const db = require('./database/db');
const eventQueries = require('./database/event_methods.js')
require('dotenv').config();


// Require the Node Slack SDK package (github.com/slackapi/node-slack-sdk)
const { WebClient, LogLevel } = require("@slack/web-api");

// WebClient instantiates a client that can call API methods
// When using Bolt, you can use either `app.client` or the `client` passed to listeners.
const client = new WebClient(process.env.SLACK_BOT_TOKEN, {
  logLevel: LogLevel.ERROR
});

const fetchPermalink = async (channel, message_ts) => {
  const permalinkObj = await client.chat.getPermalink({
    channel: channel, 
    message_ts: message_ts
  }); 
  return permalinkObj.permalink; 

}
const buildEventPostBlocks = (eventDescription, emails) => {
  const blocks = [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": eventDescription
      },
    }, 
    {
			"type": "divider"
		},
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Joining ✅*\n" + emails.join('\n')
      },
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          
          "text": {
            "type": "plain_text",
            "text": "Join",
            "emoji": true
          },
          "style": "primary",
          "action_id": "button_yes_click"
        },
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "Can't Make It",
            "emoji": true
          },
          "style":  "danger",
          "action_id": "button_no_click"
        }, 
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "Create Channel",
            "emoji": true
          },
         "action_id": "button_create_channel_click"
        }, 
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "Create Ticket",
            "emoji": true, 
          },
          "action_id": "create_ticket",
          "url": "https://peopleops.atlassian.net/servicedesk/customer/portal/24/group/107/create/2209"
        }, 
      ]
    }
  ];
     
  return blocks;

}
const mapUserIdsToEmails = async (ids) => {
  const emailsPromises = ids.map(async (id) => {
    const userProfile = (await client.users.profile.get({user: id})); 
    return userProfile.profile.email;
  });

  return await Promise.all(emailsPromises);
}

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true, 
  appToken: process.env.SLACK_APP_TOKEN, 
  port: process.env.PORT || 3000
});

app.command('/rcg', async ({ command, say, client, ack }) => {
    await ack();
    const channelId = command.channel_id;
    const eventDescription = command.text; 
    const organizerId = command.user_id;
    const blocks =  buildEventPostBlocks(eventDescription, [])
    const result = await say({
      blocks: blocks, 
      text: eventDescription
    });

    const permalink = await fetchPermalink(command.channel_id, result.ts); 

    await eventQueries.createEvent(
      permalink, 
      channelId, 
      eventDescription, 
      organizerId
    ); 

  });


app.action({action_id: 'create_ticket'}, 
  async({body, client, ack, logger}) => {
    await ack(); 
    console.log("Create Ticket");
  }
); 

app.action({ action_id: 'button_yes_click'},
  async ({ body, client, ack, logger }) => {
    await ack();
    try {
      // Ensure the action isn't from a view (modal or app home)
      if (body.message) {
        // Fetch event from db using permalink as a unique id
        const permalink = await fetchPermalink(body.channel.id, body.container.message_ts); 
        const event = await eventQueries.findEvent(permalink); 
        const eventDescription = event.eventDescription; 

        const yesIds = event.yesAttendeeIds;
        const newYesId = body.user.id;
        if (yesIds.indexOf(newYesId) != -1) {
           return;
        }
        yesIds.push(newYesId);

        const yesEmails = await mapUserIdsToEmails(yesIds); 
        const blocks = buildEventPostBlocks(eventDescription, yesEmails); 

        await client.chat.update({
            ts: body.message.ts,
            channel: body.channel.id,
            blocks: blocks,
            text: eventDescription
          });
        eventQueries.updateEventYesAttendees(permalink, yesIds);
      }  
    }
    catch (error) {
      logger.error(error);
    }
  });


app.action({ action_id: 'button_no_click'},
  async ({ body, client, ack, logger }) => {
    await ack();
    try {
      // Make sure the action isn't from a view (modal or app home)
      if (body.message) {
        const permalink = await fetchPermalink(body.channel.id, body.container.message_ts); 
        const event = await eventQueries.findEvent(permalink); 
        const eventDescription = event.eventDescription; 

        const noIds = event.noAttendeeIds;
        const yesIds = event.yesAttendeeIds; 
        const newNoId = body.user.id;

        const indexNoId = noIds.indexOf(newNoId); 
        const indexYesId = yesIds.indexOf(newNoId); 
        
        if (indexNoId == -1) {
          noIds.push(newNoId); 
        }
        if (indexYesId != -1) {
          yesIds.splice(indexYesId, 1); 
        }

        // Future extension: handle noEmails
        const noEmails = await mapUserIdsToEmails(noIds); 
        const yesEmails = await mapUserIdsToEmails(yesIds);

        const blocks = buildEventPostBlocks(eventDescription, yesEmails); 

        await client.chat.update({
            ts: body.message.ts,
            channel: body.channel.id,
            blocks: blocks,
            text: eventDescription
          });
        eventQueries.updateEventYesAttendees(permalink, yesIds);
        eventQueries.updateEventNoAttendees(permalink, noIds);
      }
    }
    catch (error) {
      logger.error(error);
    }
  });

app.action({ action_id: 'button_create_channel_click'},
  async ({ body, client, ack, logger }) => {
    await ack();
    try {
      // ensure the action isn't from a view (modal or app home)
      if (body.message) {
        const permalink = await fetchPermalink(body.channel.id, body.container.message_ts); 
        const result = await client.views.open({
          trigger_id: body.trigger_id,
          view: {
            type: 'modal',
            callback_id: 'view_1',
            title: {
              type: 'plain_text',
              text: 'RCG Bot'
            },
            blocks: [
              {
                type: 'input',
                block_id: 'input_a',
                label: {
                  type: 'plain_text',
                  text: 'Give your channel a name'
                },
                element: {
                  type: 'plain_text_input',
                  action_id: 'save-channel-name'
                }
              }
            ],
            submit: {
              type: 'plain_text',
              text: 'Submit'
            },
            private_metadata:  permalink
            
          }
        });
      }
    }
    catch (error) {
      logger.error(error);
    }
  });


app.view('view_1', async ({ ack, body, view, client, logger }) => {
  await ack();
  const permalink = view.private_metadata; 
  const event = await eventQueries.findEvent(permalink);
  const yesIds = event.yesAttendeeIds;

  const input = view.state.values.input_a; 
  const slackChannelName = input['save-channel-name'].value;
  try {
    const newChannel = await client.conversations.create({name: slackChannelName}); 
    const channelId = newChannel.channel.id;
    const result = await client.conversations.invite({
      channel: channelId, 
      users: yesIds.join(",")
    });

  } catch (error) {
    // error creating slack channel make sure no duplicates... 
    // TODO: figure out how to handle
  }
});
  

(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);
  await db.connect();
  console.log('⚡️ Bolt app is running!');
})();