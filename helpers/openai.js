const OpenAI = require("openai");
const fs = require("fs");

async function initOpenAI(apiKey) {
  const openai = new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true
  });

  return openai;
}

async function getChatGptResponse(apiKey, prompt) {
  try {
    const openai = await initOpenAI(apiKey);

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: prompt }
      ]
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error getting response from OpenAI:", error);
    throw error;
  }
}


async function getChatGptResponseImages(apiKey, prompt, b64s) {
  try {
    const openai = await initOpenAI(apiKey);


    const imageMessages = b64s.map(b64 => ({
      type: "image_url",
      image_url: {
        url: b64,
        detail: "high"
      }
    }));







    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            ...imageMessages

          ]
        }
      ],


    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error getting response from OpenAI:", error);
    throw error;
  }
}




module.exports = { getChatGptResponse, getChatGptResponseImages };
