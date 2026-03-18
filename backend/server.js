const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const RuleEngine = require('./engine/ruleEngine');

const app = express();
const PORT = 5000;
const DB_PATH = path.join(__dirname, 'db.json');

app.use(cors());
app.use(bodyParser.json());

// --- Simple JSON Data Layer ---
const getDB = () => JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
const saveDB = (data) => fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

// Initialize DB if empty
if (!fs.existsSync(DB_PATH)) {
  saveDB({ workflows: [], executions: [] });
}

// --- Workflow Routes ---

app.get('/api/workflows', (req, res) => {
  const db = getDB();
  res.json(db.workflows.map(w => ({
    ...w,
    _count: { steps: w.steps.length }
  })));
});

app.post('/api/workflows', (req, res) => {
  const { name, inputSchema } = req.body;
  const db = getDB();
  const workflow = {
    id: uuidv4(),
    name,
    version: 1,
    isActive: true,
    inputSchema: typeof inputSchema === 'string' ? inputSchema : JSON.stringify(inputSchema || {}),
    steps: [],
    createdAt: new Date().toISOString()
  };
  db.workflows.push(workflow);
  saveDB(db);
  res.status(201).json(workflow);
});

app.get('/api/workflows/:id', (req, res) => {
  const db = getDB();
  const workflow = db.workflows.find(w => w.id === req.params.id);
  if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
  res.json(workflow);
});

app.put('/api/workflows/:id', (req, res) => {
  const db = getDB();
  const index = db.workflows.findIndex(w => w.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Workflow not found' });
  
  db.workflows[index] = { ...db.workflows[index], ...req.body, version: db.workflows[index].version + 1 };
  saveDB(db);
  res.json(db.workflows[index]);
});

// --- Step Routes ---

app.post('/api/workflows/:workflowId/steps', (req, res) => {
  const { workflowId } = req.params;
  const db = getDB();
  const index = db.workflows.findIndex(w => w.id === workflowId);
  if (index === -1) return res.status(404).json({ error: 'Workflow not found' });
  
  const step = {
    id: uuidv4(),
    ...req.body,
    rules: [],
    createdAt: new Date().toISOString()
  };
  db.workflows[index].steps.push(step);
  saveDB(db);
  res.status(201).json(step);
});

// --- Rule Routes ---

app.post('/api/steps/:stepId/rules', (req, res) => {
  const { stepId } = req.params;
  const db = getDB();
  
  let stepFound = false;
  for (const wf of db.workflows) {
    const step = wf.steps.find(s => s.id === stepId);
    if (step) {
      const rule = {
        id: uuidv4(),
        ...req.body,
        createdAt: new Date().toISOString()
      };
      step.rules.push(rule);
      stepFound = true;
      break;
    }
  }
  
  if (!stepFound) return res.status(404).json({ error: 'Step not found' });
  saveDB(db);
  res.status(201).json({ status: 'Rule added' });
});

// --- Execution Engine ---

app.post('/api/workflows/:id/execute', (req, res) => {
  const { id } = req.params;
  const { data, triggeredBy } = req.body;
  const db = getDB();
  const workflow = db.workflows.find(w => w.id === id);

  if (!workflow || workflow.steps.length === 0) {
    return res.status(400).json({ error: 'Workflow not found or has no steps' });
  }

  const execution = {
    id: uuidv4(),
    workflowId: id,
    status: 'in_progress',
    data: data,
    logs: [],
    startedAt: new Date().toISOString()
  };

  db.executions.push(execution);
  saveDB(db);

  // Run execution synchronously for simple demo (or use async if needed)
  runWorkflow(execution.id, workflow, data);

  res.json({ executionId: execution.id, status: 'started' });
});

function runWorkflow(executionId, workflow, data) {
  let currentStep = workflow.steps[0];
  const logs = [];

  while (currentStep) {
    const startTime = new Date();
    let selectedNextStepId = null;
    let evaluatedRules = [];

    // Evaluate rules
    for (const rule of currentStep.rules) {
      const result = RuleEngine.evaluate(rule.condition, data);
      evaluatedRules.push({ rule: rule.condition, result });
      if (result) {
        selectedNextStepId = rule.nextStepId;
        break;
      }
    }

    logs.push({
      stepName: currentStep.name,
      stepType: currentStep.stepType,
      evaluatedRules,
      selectedNextStep: selectedNextStepId ? workflow.steps.find(s => s.id === selectedNextStepId)?.name : 'End',
      status: 'completed',
      startedAt: startTime.toISOString(),
      duration: new Date() - startTime
    });

    currentStep = workflow.steps.find(s => s.id === selectedNextStepId);
  }

  const db = getDB();
  const execIdx = db.executions.findIndex(e => e.id === executionId);
  if (execIdx !== -1) {
    db.executions[execIdx].logs = logs;
    db.executions[execIdx].status = 'completed';
    db.executions[execIdx].endedAt = new Date().toISOString();
    saveDB(db);
  }
}

app.get('/api/executions/:id', (req, res) => {
  const db = getDB();
  const execution = db.executions.find(e => e.id === req.params.id);
  if (!execution) return res.status(404).json({ error: 'Execution not found' });
  res.json(execution);
});

app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
