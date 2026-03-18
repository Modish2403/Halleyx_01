const API_URL = 'http://localhost:5000/api';

async function setupSample() {
  try {
    console.log('Creating sample workflow...');
    const wfRes = await fetch(`${API_URL}/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Expense Approval',
        inputSchema: {
          amount: { type: 'number', required: true },
          country: { type: 'string', required: true },
          priority: { type: 'string', required: true, allowed_values: ['High', 'Medium', 'Low'] }
        }
      })
    });
    const wfData = await wfRes.json();
    const wfId = wfData.id;

    console.log('Adding steps...');
    const s1Res = await fetch(`${API_URL}/workflows/${wfId}/steps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Manager Approval',
        stepType: 'approval',
        order: 1,
        metadata: { assignee: 'manager@example.com' }
      })
    });
    const s1Data = await s1Res.json();
    const step1Id = s1Data.id;

    const s2Res = await fetch(`${API_URL}/workflows/${wfId}/steps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Finance Review',
        stepType: 'task',
        order: 2
      })
    });
    const s2Data = await s2Res.json();
    const step2Id = s2Data.id;

    console.log('Adding rules...');
    await fetch(`${API_URL}/steps/${step1Id}/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        condition: 'amount > 500',
        nextStepId: step2Id,
        priority: 1
      })
    });

    await fetch(`${API_URL}/steps/${step1Id}/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        condition: 'DEFAULT',
        nextStepId: null,
        priority: 2
      })
    });

    console.log('Sample setup complete!');
  } catch (error) {
    console.error('Setup failed:', error.message);
  }
}

setupSample();
