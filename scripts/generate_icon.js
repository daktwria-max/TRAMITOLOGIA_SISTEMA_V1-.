
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const width = 512;
const height = 512;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

// --- Colors ---
const bgGradient = ctx.createLinearGradient(0, 0, width, height);
bgGradient.addColorStop(0, '#0f172a'); // Slate 900
bgGradient.addColorStop(1, '#1e293b'); // Slate 800

const accentColor = '#06b6d4'; // Cyan 500
const accentDark = '#0891b2'; // Cyan 600

// --- Background ---
// Rounded Rect
const radius = 90;
ctx.beginPath();
ctx.roundRect(20, 20, width - 40, height - 40, radius);
ctx.fillStyle = bgGradient;
ctx.fill();
// Border
ctx.lineWidth = 10;
ctx.strokeStyle = '#334155'; // Slate 700
ctx.stroke();

// --- Symbol: Abstract Shield/Document ---
const centerX = width / 2;
const centerY = height / 2;
const scale = 0.6;

ctx.translate(centerX, centerY);
ctx.scale(scale, scale);
ctx.translate(-centerX, -centerY);

// Draw Shield shape
ctx.beginPath();
ctx.moveTo(centerX, 100);
ctx.bezierCurveTo(width - 50, 100, width - 50, 350, centerX, height - 50);
ctx.bezierCurveTo(50, 350, 50, 100, centerX, 100);
ctx.closePath();

ctx.fillStyle = 'rgba(6, 182, 212, 0.1)';
ctx.fill();
ctx.lineWidth = 15;
ctx.strokeStyle = accentColor;
ctx.stroke();

// Draw Document/Check inside
ctx.beginPath();
ctx.moveTo(centerX - 60, centerY - 20); // Checkmark start
ctx.lineTo(centerX - 10, centerY + 50); // Checkmark bottom
ctx.lineTo(centerX + 80, centerY - 80); // Checkmark top
ctx.lineWidth = 25;
ctx.lineCap = 'round';
ctx.lineJoin = 'round';
ctx.strokeStyle = '#fff';
ctx.stroke();

// Add details (Digital dots)
ctx.fillStyle = accentColor;
ctx.beginPath();
ctx.arc(centerX, 100, 10, 0, Math.PI * 2);
ctx.fill();

ctx.beginPath();
ctx.arc(centerX, height - 50, 10, 0, Math.PI * 2);
ctx.fill();

// --- Save ---
const buffer = canvas.toBuffer('image/png');
const outPath = path.join(__dirname, '../resources/icon.png');

// Ensure directory exists
const resourcesDir = path.dirname(outPath);
if (!fs.existsSync(resourcesDir)) {
    fs.mkdirSync(resourcesDir);
}

fs.writeFileSync(outPath, buffer);
console.log(`Icon generated at: ${outPath}`);
