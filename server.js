require('dotenv').config();
const express = require('express');
const { CopilotRuntime, OpenAIAdapter, copilotRuntimeNodeHttpEndpoint } = require('@copilotkit/runtime');
const { Configuration, OpenAIApi } = require('openai'); // Corrected import for OpenAI
const cors = require('cors');
//const fetch = require('node-fetch'); // Required for GitHub API fetch
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));


const app = express();

/*const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY, // Correctly initialize OpenAI
});
const openai = new OpenAIApi(configuration);*/

//const serviceAdapter = new OpenAIAdapter({ openai });
//const runtime = new CopilotRuntime();

app.use(cors());
app.use(express.json());

let projects = [
  { id: 1, name: 'AI Chat App', description: 'A simple chat app with AI.' },
  { id: 2, name: 'Repository Manager', description: 'Manage and recommend repositories.' },
];

// CopilotKit endpoint
app.use('/copilotkit', (req, res, next) => {
  const handler = copilotRuntimeNodeHttpEndpoint({
    endpoint: '/copilotkit',
    runtime,
    serviceAdapter,
  });
  return handler(req, res, next);
});

app.post('/analyze-project', async (req, res) => {
    console.log('Request received at /analyze-project:', req.body);
    const { project } = req.body;
  
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, // Add your API key
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are an advanced project management assistant.' },
            {
              role: 'user',
              content: `Analyze the following project repository:\n\nName: ${project.name}\nDescription: ${project.description}\nURL: ${project.url}\n\nProvide actionable insights, improvements, or tasks.`,
            },
          ],
        }),
      });
  
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }
  
      const data = await response.json();
      console.log('Response from OpenAI API:', data); 
      const analysis = data.choices[0].message.content;
      res.json({ analysis });
    } catch (error) {
      console.error('Error analyzing project:', error);
      res.status(500).json({ error: 'Failed to analyze project' });
    }
  });
// Analyze project with OpenAI
/*app.post('/analyze-project', async (req, res) => {
    const { project } = req.body;
    try {
      const response = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are an advanced project management assistant.' },
          {
            role: 'user',
            content: `Analyze the following project repository:\n\nName: ${project.name}\nDescription: ${project.description}\nURL: ${project.url}\n\nProvide actionable insights, improvements, or tasks.`,
          },
        ],
      });
  
      const analysis = response.data.choices[0].message.content;
      res.json({ analysis });
    } catch (error) {
      console.error('Error analyzing project:', error);
      res.status(500).json({ error: 'Failed to analyze project' });
    }
  });*/
  

// Fetch GitHub projects
app.get('/github-projects', async (req, res) => {
  try {
    const response = await fetch('https://api.github.com/user/repos', {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, // Use the token securely
      },
    });
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }
    const data = await response.json();

    // Format data for the frontend
    const formattedData = data.map((repo) => ({
      id: repo.id,
      name: repo.name,
      description: repo.description || 'No description provided',
      url: repo.html_url,
    }));

    res.json(formattedData);
  } catch (error) {
    console.error('Error fetching GitHub repositories:', error);
    res.status(500).json({ error: 'Failed to fetch GitHub repositories' });
  }
});

// Fetch predefined projects
app.get('/projects', (req, res) => {
  console.log('Received request for /projects');
  try {
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Start the server
app.listen(4000, () => {
  console.log('Server is running at http://localhost:4000/copilotkit');
});
