import React, { useState, useEffect } from 'react';
import './index.css';

const API_BASE = 'http://localhost:5000/api';
const STEP_TYPES = ['task', 'approval', 'notification'];

function App() {
  const [view, setView] = useState('list');
  const [workflows, setWorkflows] = useState([]);
  const [currentWorkflow, setCurrentWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/workflows`);
      const data = await res.json();
      setWorkflows(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchWorkflows(); }, []);

  const handleCreateWorkflow = () => {
    const newWf = {
      name: 'New Workflow',
      inputSchema: JSON.stringify({
        amount: { type: 'number', required: true },
        priority: { type: 'string', required: true, allowed_values: ['High', 'Medium', 'Low'] }
      }),
      steps: []
    };
    setCurrentWorkflow(newWf);
    setView('edit');
  };

  const handleEditWorkflow = async (wf) => {
    try {
      const res = await fetch(`${API_BASE}/workflows/${wf.id}`);
      const data = await res.json();
      setCurrentWorkflow(data);
      setView('edit');
    } catch (e) { console.error(e); }
  };

  const handleSaveWorkflow = async () => {
    const method = currentWorkflow.id ? 'PUT' : 'POST';
    const url = currentWorkflow.id ? `${API_BASE}/workflows/${currentWorkflow.id}` : `${API_BASE}/workflows`;
    
    try {
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentWorkflow)
      });
      fetchWorkflows();
      setView('list');
    } catch (e) { console.error(e); }
  };

  const handleStartExecute = (wf) => {
    setCurrentWorkflow(wf);
    setView('execute');
  };

  return (
    <div className="container">
      {view === 'list' && (
        <ListView 
          workflows={workflows} 
          loading={loading} 
          onEdit={handleEditWorkflow} 
          onCreate={handleCreateWorkflow}
          onExecute={handleStartExecute}
        />
      )}
      
      {view === 'edit' && (
        <EditorView 
          workflow={currentWorkflow} 
          onSave={handleSaveWorkflow} 
          onCancel={() => setView('list')}
          setWorkflow={setCurrentWorkflow}
        />
      )}

      {view === 'execute' && (
        <ExecutionView 
          workflow={currentWorkflow}
          onBack={() => setView('list')}
        />
      )}
    </div>
  );
}

// --- List View ---
function ListView({ workflows, loading, onEdit, onCreate, onExecute }) {
  return (
    <div className="animate-fade-in">
      <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '8px' }}>
            Workflow <span style={{ color: 'var(--accent-color)' }}>Engine</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Design, execute, and track your business processes.</p>
        </div>
        <button className="btn btn-primary" onClick={onCreate}><span>+</span> Create New Workflow</button>
      </header>
      <div className="glass-card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '20px' }}>Active Workflows</h2>
        {loading ? <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  <th style={{ padding: '16px' }}>NAME</th>
                  <th style={{ padding: '16px' }}>STEPS</th>
                  <th style={{ padding: '16px' }}>VERSION</th>
                  <th style={{ padding: '16px' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {workflows.map(wf => (
                  <tr key={wf.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: '600' }}>{wf.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{wf.id.substring(0,8)}...</div>
                    </td>
                    <td style={{ padding: '16px' }}><span className="glass-card" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>{wf._count?.steps || 0} Steps</span></td>
                    <td style={{ padding: '16px' }}>v{wf.version}</td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-secondary" onClick={() => onEdit(wf)}>Edit</button>
                        <button className="btn btn-primary" onClick={() => onExecute(wf)}>Execute</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Editor View ---
function EditorView({ workflow, onSave, onCancel, setWorkflow }) {
  const [activeStepId, setActiveStepId] = useState(workflow.steps?.[0]?.id || null);
  const [showSchema, setShowSchema] = useState(false);
  const activeStep = workflow.steps?.find(s => s.id === activeStepId);

  const addStep = () => {
    const id = Math.random().toString(36).substr(2, 9);
    const newStep = { id, name: 'New Step', stepType: 'task', order: (workflow.steps?.length || 0) + 1, rules: [] };
    setWorkflow({ ...workflow, steps: [...(workflow.steps || []), newStep] });
    setActiveStepId(id);
  };

  const updateStep = (updatedStep) => {
    setWorkflow({ ...workflow, steps: workflow.steps.map(s => s.id === updatedStep.id ? updatedStep : s) });
  };

  return (
    <div className="animate-fade-in">
      <header style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="btn btn-secondary" onClick={onCancel}>← Back</button>
          <h2 style={{ fontSize: '1.5rem' }}>Edit Workflow: <span style={{ color: 'var(--accent-color)' }}>{workflow.name}</span></h2>
        </div>
        <button className="btn btn-primary" onClick={onSave}>Save Changes</button>
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <section className="glass-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3>Config</h3>
              <button className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => setShowSchema(!showSchema)}>Schema</button>
            </div>
            {showSchema ? <textarea 
              style={{ width: '100%', height: '150px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#3b82f6', borderRadius: '8px' }}
              value={workflow.inputSchema} onChange={e => setWorkflow({ ...workflow, inputSchema: e.target.value })}
            /> : <input className="btn btn-secondary" style={{ width: '100%', textAlign: 'left' }} value={workflow.name} onChange={e => setWorkflow({ ...workflow, name: e.target.value })} />}
          </section>
          <section className="glass-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3>Steps</h3>
              <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '0.7rem' }} onClick={addStep}>+ Step</button>
            </div>
            {workflow.steps?.map(s => (
              <div key={s.id} className={`glass-card ${activeStepId === s.id ? 'active' : ''}`} style={{ padding: '12px', marginBottom: '8px', cursor: 'pointer', borderLeft: activeStepId === s.id ? '4px solid var(--accent-color)' : '' }} onClick={() => setActiveStepId(s.id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{s.order}. {s.name}</span><span style={{ fontSize: '0.7rem' }}>{s.stepType}</span></div>
              </div>
            ))}
          </section>
        </div>
        <div className="glass-card" style={{ padding: '24px' }}>
          {activeStep ? (
            <div>
              <h3>Step: {activeStep.name}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', margin: '20px 0' }}>
                <input style={{ background: 'var(--glass-bg)', color: 'white', border: '1px solid var(--border-color)' }} value={activeStep.name} onChange={e => updateStep({ ...activeStep, name: e.target.value })} />
                <select style={{ background: 'var(--glass-bg)', color: 'white', border: '1px solid var(--border-color)' }} value={activeStep.stepType} onChange={e => updateStep({ ...activeStep, stepType: e.target.value })}>
                  {STEP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <h4>Rules</h4>
              <button className="btn btn-secondary" style={{ marginBottom: '16px' }} onClick={() => updateStep({ ...activeStep, rules: [...activeStep.rules, { id: Math.random(), condition: '', nextStepId: null }] })}>+ Add Rule</button>
              {activeStep.rules?.map(r => (
                <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 40px', gap: '10px', marginBottom: '8px' }}>
                  <input placeholder="Condition" style={{ background: 'rgba(0,0,0,0.2)', color: 'white' }} value={r.condition} onChange={e => updateStep({ ...activeStep, rules: activeStep.rules.map(rule => rule.id === r.id ? { ...rule, condition: e.target.value } : rule) })} />
                  <select style={{ background: 'rgba(0,0,0,0.2)', color: 'white' }} value={r.nextStepId || 'null'} onChange={e => updateStep({ ...activeStep, rules: activeStep.rules.map(rule => rule.id === r.id ? { ...rule, nextStepId: e.target.value === 'null' ? null : e.target.value } : rule) })}>
                    <option value="null">End</option>
                    {workflow.steps.filter(s => s.id !== activeStep.id).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <button className="btn" style={{ color: 'var(--error)' }} onClick={() => updateStep({ ...activeStep, rules: activeStep.rules.filter(rule => rule.id !== r.id) })}>×</button>
                </div>
              ))}
            </div>
          ) : <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-secondary)' }}>Select a step</div>}
        </div>
      </div>
      <style>{`.glass-card.active { background: rgba(59, 130, 246, 0.1); }`}</style>
    </div>
  );
}

// --- Execution View ---
function ExecutionView({ workflow, onBack }) {
  const [data, setData] = useState({});
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('idle');
  const schema = JSON.parse(workflow.inputSchema || '{}');

  const execute = async () => {
    setStatus('running');
    try {
      const res = await fetch(`${API_BASE}/workflows/${workflow.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data })
      });
      const { executionId } = await res.json();
      
      const poll = setInterval(async () => {
        const r = await fetch(`${API_BASE}/executions/${executionId}`);
        const d = await r.json();
        setLogs(d.logs);
        if (d.status === 'completed') {
          setStatus('done');
          clearInterval(poll);
        }
      }, 1000);
    } catch (e) { setStatus('error'); }
  };

  return (
    <div className="animate-fade-in">
      <header style={{ marginBottom: '30px', display: 'flex', gap: '16px' }}>
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        <h2>Execute: {workflow.name}</h2>
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        <section className="glass-card" style={{ padding: '24px' }}>
          <h3>Input Data</h3>
          {Object.keys(schema).map(k => (
            <div key={k} style={{ margin: '12px 0' }}>
              <label>{k}</label>
              <input type={schema[k].type === 'number' ? 'number' : 'text'} className="btn btn-secondary" style={{ width: '100%', textAlign: 'left' }} onChange={e => setData({ ...data, [k]: e.target.value })} />
            </div>
          ))}
          <button className="btn btn-primary" style={{ width: '100%', marginTop: '20px' }} onClick={execute} disabled={status === 'running'}>{status === 'running' ? 'Running...' : 'Execute'}</button>
        </section>
        <section className="glass-card" style={{ padding: '24px' }}>
          <h3>Execution Tracker</h3>
          <div style={{ marginTop: '20px' }}>
            {logs.map((l, i) => (
              <div key={i} className="glass-card" style={{ padding: '16px', marginBottom: '12px', background: 'rgba(255,255,255,0.02)', borderLeft: '4px solid var(--success)' }}>
                <div style={{ fontWeight: '700' }}>{l.stepName} ({l.stepType})</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Next: {l.selectedNextStep}</div>
                <div style={{ marginTop: '8px', fontSize: '0.75rem', background: 'rgba(0,0,0,0.2)', padding: '8px' }}>
                  {l.evaluatedRules.map((ru, j) => (
                    <div key={j} style={{ display: 'flex', justifyContent: 'space-between' }}><span>{ru.rule}</span><span style={{ color: ru.result ? 'var(--success)' : 'var(--error)' }}>{ru.result ? 'Match' : 'No'}</span></div>
                  ))}
                </div>
              </div>
            ))}
            {status === 'idle' && <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>Logs will appear here</div>}
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;
