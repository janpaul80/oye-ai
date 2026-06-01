// Langdock End-to-End Test Script
// Run: node test-langdock.mjs

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const LANGDOCK_API_KEY = process.env.LANGDOCK_API_KEY;
const LANGDOCK_BASE_URL = process.env.LANGDOCK_OPENAI_BASE_URL || 'https://api.langdock.com/openai/eu/v1/chat/completions';
const MODEL = process.env.LANGDOCK_OPENAI_MODEL || 'gpt-4o';

console.log('=== Langdock E2E Validation ===\n');
console.log('Config:');
console.log('  API Key:', LANGDOCK_API_KEY ? 'SET ✓' : 'MISSING ✗');
console.log('  Base URL:', LANGDOCK_BASE_URL);
console.log('  Model:', MODEL);
console.log('');

// Test 1: Basic Spanish conversation
async function testSpanish() {
  console.log('--- Test 1: Spanish Conversation ---');
  const start = Date.now();
  
  const response = await fetch(`${LANGDOCK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LANGDOCK_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: 'Eres un asistente útil de negocio.' },
        { role: 'user', content: 'Hola, quiero información sobre sus servicios de restaurant' }
      ],
      max_tokens: 100
    })
  });
  
  const data = await response.json();
  const latency = Date.now() - start;
  
  console.log('Input: "Hola, quiero información sobre sus servicios de restaurant"');
  console.log('Model:', MODEL);
  console.log('Latency:', latency + 'ms');
  console.log('Output:', data.choices?.[0]?.message?.content || 'EMPTY - check error:', data);
  console.log('');
  
  return { success: !!data.choices?.[0]?.message?.content, latency };
}

// Test 2: English conversation
async function testEnglish() {
  console.log('--- Test 2: English Conversation ---');
  const start = Date.now();
  
  const response = await fetch(`${LANGDOCK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LANGDOCK_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: 'You are a helpful business assistant.' },
        { role: 'user', content: 'What services do you offer?' }
      ],
      max_tokens: 100
    })
  });
  
  const data = await response.json();
  const latency = Date.now() - start;
  
  console.log('Input: "What services do you offer?"');
  console.log('Model:', MODEL);
  console.log('Latency:', latency + 'ms');
  console.log('Output:', data.choices?.[0]?.message?.content || 'EMPTY - check error:', data);
  console.log('');
  
  return { success: !!data.choices?.[0]?.message?.content, latency };
}

// Test 3: Business knowledge - services
async function testBusinessKnowledge() {
  console.log('--- Test 3: Business Knowledge Retrieval ---');
  const start = Date.now();
  
  const response = await fetch(`${LANGDOCK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LANGDOCK_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: 'Eres asistente de un restaurant chamado Sabores. Servicios: Almuerzo Ejecutivo $12, Cena Romántica $89, Cumpleaños $150.' },
        { role: 'user', content: '¿Cuál es el precio del almuerzo ejecutivo?' }
      ],
      max_tokens: 80
    })
  });
  
  const data = await response.json();
  const latency = Date.now() - start;
  
  console.log('Input: "¿Cuál es el precio del almuerzo ejecutivo?"');
  console.log('Model:', MODEL);
  console.log('Latency:', latency + 'ms');
  console.log('Output:', data.choices?.[0]?.message?.content || 'EMPTY');
  console.log('');
  
  return { success: !!data.choices?.[0]?.message?.content, latency };
}

// Test 4: Conversation summary
async function testSummary() {
  console.log('--- Test 4: Conversation Summary ---');
  const start = Date.now();
  
  const response = await fetch(`${LANGDOCK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LANGDOCK_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: 'Create a brief summary in Spanish.' },
        { role: 'user', content: 'Cliente dice: Hola, quiero reservar. Restaurant: Cuántas personas? Cliente: Somos 5. Restaurant: Qué horario? Cliente: 7pm por favor.' }
      ],
      max_tokens: 50
    })
  });
  
  const data = await response.json();
  const latency = Date.now() - start;
  
  console.log('Input: Conversation transcript');
  console.log('Model:', MODEL);
  console.log('Latency:', latency + 'ms');
  console.log('Output:', data.choices?.[0]?.message?.content || 'EMPTY');
  console.log('');
  
  return { success: !!data.choices?.[0]?.message?.content, latency };
}

// Test 5: Lead scoring
async function testLeadScoring() {
  console.log('--- Test 5: Lead Scoring ---');
  const start = Date.now();
  
  const response = await fetch(`${LANGDOCK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LANGDOCK_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: 'Provide a lead score 0-100 based on intent to buy. Respond only with the number.' },
        { role: 'user', content: 'Cliente dice: Hola, me interesa mucho el servicio, cuándo pueden atenderme?' }
      ],
      max_tokens: 10
    })
  });
  
  const data = await response.json();
  const latency = Date.now() - start;
  
  console.log('Input: High intent customer message');
  console.log('Model:', MODEL);
  console.log('Latency:', latency + 'ms');
  console.log('Output:', data.choices?.[0]?.message?.content || 'EMPTY');
  console.log('');
  
  return { success: !!data.choices?.[0]?.message?.content, latency };
}

// Test 6: Sentiment analysis
async function testSentiment() {
  console.log('--- Test 6: Sentiment Analysis ---');
  const start = Date.now();
  
  const response = await fetch(`${LANGDOCK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LANGDOCK_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: 'Classify sentiment as positive, neutral, or negative. Respond with only one word.' },
        { role: 'user', content: '¡Me encanta su servicio! Muito bom.' }
      ],
      max_tokens: 10
    })
  });
  
  const data = await response.json();
  const latency = Date.now() - start;
  
  console.log('Input: "¡Me encanta su servicio! Muito bom."');
  console.log('Model:', MODEL);
  console.log('Latency:', latency + 'ms');
  console.log('Output:', data.choices?.[0]?.message?.content || 'EMPTY');
  console.log('');
  
  return { success: !!data.choices?.[0]?.message?.content, latency };
}

// Run all tests
async function runTests() {
  if (!LANGDOCK_API_KEY) {
    console.log('ERROR: LANGDOCK_API_KEY not set in .env.local');
    return;
  }
  
  try {
    const results = [];
    
    results.push(await testSpanish());
    results.push(await testEnglish());
    results.push(await testBusinessKnowledge());
    results.push(await testSummary());
    results.push(await testLeadScoring());
    results.push(await testSentiment());
    
    const passed = results.filter(r => r.success).length;
    const total = results.length;
    const avgLatency = Math.round(results.reduce((sum, r) => sum + r.latency, 0) / total);
    
    console.log('=== SUMMARY ===');
    console.log(`Passed: ${passed}/${total} tests`);
    console.log(`Avg Latency: ${avgLatency}ms`);
    console.log('');
    
    if (passed === total) {
      console.log('✅ Langdock AI Layer: OPERATIONAL');
    } else {
      console.log('⚠️ Langdock AI Layer: PARTIAL FAILURE');
    }
    
  } catch (error) {
    console.log('ERROR:', error.message);
  }
}

runTests();