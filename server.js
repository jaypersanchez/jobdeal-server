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
const runtime = new CopilotRuntime();

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

app.post('/create-task', async (req, res) => {
    const { project, taskDescription } = req.body;

    try {
        console.log('Creating task for project:', project.name);

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: 'You are a GitHub project management assistant.' },
                    {
                        role: 'user',
                        content: `Based on the following project, generate a detailed task:\n\nProject Name: ${project.name}\nDescription: ${project.description}\n\nTask: ${taskDescription}`,
                    },
                ],
            }),
        });

        const data = await response.json();
        const task = data.choices[0].message.content;
        console.log('Generated task:', task);
        console.log('Project owner:', project.owner);
        console.log('Project name:', project.name);
        console.log(`GitHub Repository URL: https://api.github.com/repos/${project.owner}/${project.name}/issues`);
// Create a GitHub issue using the task
        const githubResponse = await fetch(
            `https://api.github.com/repos/${project.owner}/${project.name}/issues`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ title: taskDescription, body: task }),
            }
        );

        if (!githubResponse.ok) {
            const errorData = await githubResponse.json();
            console.error('GitHub API error:', githubResponse.status, errorData);
            throw new Error(`GitHub API error: ${githubResponse.status} - ${errorData.message}`);
        }

        const issue = await githubResponse.json();
        console.log('GitHub issue created:', issue);
        res.json({ task });
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ error: 'Failed to create task' });
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
        const response = await fetch('https://api.github.com/user/repos?per_page=100', {
            headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` },
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
            owner: repo.owner.login, // Add the owner field
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

// New endpoint for analyzing the resume
app.post('/analyze-resume', async (req, res) => {
    const { resumeContent } = req.body; // Expecting resume content in the request body

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
                        content: `Analyze the following resume content:\n\n${resumeContent}\n\nProvide actionable insights, improvements, or tasks.`,
                    },
                ],
            }),
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const data = await response.json();
        const analysis = data.choices[0].message.content;
        res.json({ analysis });
    } catch (error) {
        console.error('Error analyzing resume:', error);
        res.status(500).json({ error: 'Failed to analyze resume' });
    }
});

// Start the server
app.listen(4000, () => {
  console.log('Server is running at http://localhost:4000/copilotkit');
});
