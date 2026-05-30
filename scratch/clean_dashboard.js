const fs = require('fs');
const path = require('path');

const targetFilePath = path.join(__dirname, '..', 'src', 'app', 'dashboard', 'page.tsx');
let content = fs.readFileSync(targetFilePath, 'utf8');

// Perform replacements
console.log('Original content length:', content.length);

// Replace scifi cyan with WhatsApp emerald green
content = content.replace(/#00f2fe/g, '#00a884');
content = content.replace(/rgba\(0,\s*242,\s*254/g, 'rgba(0, 168, 132');

// Replace dark blue bg with warm graphite card bg (#121215)
content = content.replace(/#0b101b/g, '#121215');
content = content.replace(/#131b2e/g, '#121215');
content = content.replace(/#141b2e/g, '#121215');
content = content.replace(/#111724/g, '#121215');
content = content.replace(/#0e1726\/40/g, '#00a884/10');

// Replace any leftover cyan-ish style names
content = content.replace(/shadow-\[0_0_10px_rgba\(0,242,254,0.5\)\]/g, 'shadow-sm');

console.log('Processed content length:', content.length);

fs.writeFileSync(targetFilePath, content, 'utf8');
console.log('Replacement complete.');
