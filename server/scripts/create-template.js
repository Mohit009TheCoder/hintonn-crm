import fetch from 'node-fetch';

const WABA_ID = process.env.WHATSAPP_WABA_ID;
const TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

async function createTemplate() {
  const url = `https://graph.facebook.com/v21.0/${WABA_ID}/message_templates`;
  const payload = {
    name: 'new_welcome',
    language: 'en_US',
    category: 'MARKETING',
    components: [
      {
        type: 'BODY',
        text: 'Hi {{1}}! 👋 Thank you for your interest in *{{2}}* by Ashray Group.\n\nWe have *{{3}}* options starting at {{4}}.\nPossession: *{{5}}*\n\nWould you like to schedule a site visit this week? Reply *YES* and well arrange everything for you! 🏠',
        example: {
          body_text: [
            ['Santosh', 'MJ Elegance', '2 BHK', 'prime location', 'Feb 2027']
          ]
        }
      }
    ]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  console.log('Response:', JSON.stringify(data, null, 2));
}

createTemplate();
