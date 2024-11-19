require('dotenv').config();
const express = require('express');
const { CopilotRuntime, OpenAIAdapter, copilotRuntimeNodeHttpEndpoint } = require('@copilotkit/runtime');
const OpenAI = require('openai');
const cors = require('cors');

const app = express();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const serviceAdapter = new OpenAIAdapter({ openai });
const runtime = new CopilotRuntime();

app.use(cors());

let projects = [
    { id: 1, name: 'AI Chat App', description: 'A simple chat app with AI.' },
    { id: 2, name: 'Repository Manager', description: 'Manage and recommend repositories.' },
  ];

app.use('/copilotkit', (req, res, next) => {
  const handler = copilotRuntimeNodeHttpEndpoint({
    endpoint: '/copilotkit',
    runtime,
    serviceAdapter,
  });
  return handler(req, res, next);
});

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


app.get('/projects', (req, res) => {
    console.log('Received request for /projects');
    try {
        res.json(projects);
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(4000, () => {
  console.log('Server is running at http://localhost:4000/copilotkit');
});
