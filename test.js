const axios = require("axios")

async function createTurnstileTask(API_KEY, SITE_KEY, PAGE_URL) {
  const payload = {
    clientKey: API_KEY,
    "task": {
      "type": "MtCaptchaTaskProxyLess",
      "websiteURL": PAGE_URL,
      "websiteKey": SITE_KEY
    }
  };

  try {
    const response = await axios.post('https://api.capsolver.com/createTask', payload);
    if (response.data.errorId === 0) {
      console.log('Task created:', response.data.taskId);
      return response.data.taskId;
    } else {
      throw new Error(`Create task failed: ${JSON.stringify(response.data)}`);
    }
  } catch (err) {
    console.log(err)
    throw new Error(`Error creating task: ${err.message}`);
  }
}


async function getTurnstileResult(API_KEY, taskId) {
  const payload = {
    clientKey: API_KEY,
    taskId: taskId,
  };

  try {
    const response = await axios.post('https://api.capsolver.com/getTaskResult', payload);
    return response.data;
  } catch (err) {
    throw new Error(`Error getting task result: ${err.message}`);
  }
}

async function solveTurnstile(SITE_KEY, PAGE_URL) {
  let API_KEY = 'CAP-B6CE6C2416EEB41C1DF2689EFC1301F5E68E070472A188B60A65C8814A3A7F18';

  try {
    const taskId = await createTurnstileTask(API_KEY, SITE_KEY, PAGE_URL);
    // Đợi và kiểm tra kết quả
    const pollInterval = 100;
    const maxAttemp = 10;
    let attemp = 0;
    while (true && attemp <= maxAttemp) {
      console.log('Checking result...');
      const result = await getTurnstileResult(API_KEY, taskId);
      if (result.status === 'ready') {
        let solution = result.solution;
        console.log(solution)
        return solution.token;
      }
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      attemp++;

    }
  } catch (err) {
    console.error('Solve failed:', err.message);
  }
}

solveTurnstile('MTPublic-rNhjhnaV7', 'https://j88code.com')