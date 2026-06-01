// AI Provider Benchmark Test
// Tests all available providers: Blackbox, Langdock, OpenRouter

console.log('=== AI Provider Benchmark ===\n');

// Test scenarios
const scenarios = [
  { name: 'Spanish Conversation', prompt: 'Hola, quiero información sobre sus servicios de restaurant', lang: 'es' },
  { name: 'English Conversation', prompt: 'Hello, what services do you offer?', lang: 'en' },
  { name: 'Lead Qualification', prompt: 'Estoy muy interesado en contratar un servicio, cuándo pueden comenzar?', lang: 'es' },
  { name: 'Booking Request', prompt: 'Quiero reservar una mesa para 5 personas mañana a las 7pm', lang: 'es' },
  { name: 'FAQ Retrieval', prompt: '¿Tienen estacionamiento?', lang: 'es' },
  { name: 'Sentiment Analysis', prompt: '¡Excelente servicio! Muy satisfecho.', lang: 'es' },
  { name: 'Conversation Summary', prompt: 'Cliente: Hola, quiero reservar. Restaurant: Cuántas personas? Cliente: 5. Restaurant: Qué horario? Cliente: 7pm por favor.', lang: 'es' }
];

async function testBlackbox(model, prompt) {
  const start = Date.now();
  try {
    const res = await fetch('https://api.blackbox.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer sk-5cIi5HKplvz-kN4W5VggkA',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 80 })
    });
    const data = await res.json();
    const latency = Date.now() - start;
    return { success: !!data.choices?.[0]?.message?.content, latency, content: data.choices?.[0]?.message?.content || '' };
  } catch (e) {
    return { success: false, latency: Date.now() - start, error: e.message };
  }
}

async function runBenchmarks() {
  console.log('--- Blackbox Pro Tests ---\n');
  
  for (const scenario of scenarios) {
    const result = await testBlackbox('blackboxai/blackbox-pro', scenario.prompt);
    console.log(`${scenario.name}:`);
    console.log(`  Latency: ${result.latency}ms`);
    console.log(`  Success: ${result.success ? '✓' : '✗'}`);
    console.log(`  Output: ${result.content?.substring(0, 50) || result.error || 'empty'}...`);
    console.log('');
  }
  
  console.log('--- Langdock Test (gpt-5-mini) ---');
  try {
    const start = Date.now();
    const res = await fetch('https://api.langdock.com/openai/eu/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer sk-xAxtE7FpPbEP6i6m9GX4-MroEl_QRaqk-yLRiNRKQsUxV8N9oGiO_ZzzxDwiyCXhOSIHgrPxnTTscKHAiUwrTQ',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model: 'gpt-5-mini', messages: [{ role: 'user', content: 'Hola' }], max_tokens: 30 })
    });
    const data = await res.json();
    const latency = Date.now() - start;
    console.log(`Spanish: Latency=${latency}ms, Success=${!!data.choices?.[0]?.message?.content}, Content="${data.choices?.[0]?.message?.content || 'EMPTY'}"`);
  } catch (e) {
    console.log(`Error: ${e.message}`);
  }
}

runBenchmarks();