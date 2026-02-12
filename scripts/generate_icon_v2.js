
const fs = require('fs');
const path = require('path');

try {
    const { createCanvas } = require('canvas');

    const width = 512;
    const height = 512;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // --- Colors ---
    // Fallback if gradient fails (though it shouldn't)
    ctx.fillStyle = '#1e293b';

    try {
        const bgGradient = ctx.createLinearGradient(0, 0, width, height);
        bgGradient.addColorStop(0, '#0f172a'); // Slate 900
        bgGradient.addColorStop(1, '#1e293b'); // Slate 800
        ctx.fillStyle = bgGradient;
    } catch (e) {
        console.error("Gradient error, using solid color");
    }

    const accentColor = '#06b6d4'; // Cyan 500

    // --- Background ---
    // Safe Rounded Rect
    const x = 20, y = 20, w = width - 40, h = height - 40, r = 90;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();

    ctx.fill();
    // Border
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#334155'; // Slate 700
    ctx.stroke();

    // --- Symbol: Abstract Shield/Document ---
    const centerX = width / 2;
    const centerY = height / 2;
    const scale = 0.6;

    ctx.save();
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

    ctx.restore();

    // --- Save ---
    const buffer = canvas.toBuffer('image/png');
    const outPath = path.join(__dirname, '../resources/icon.png');

    // Ensure directory exists
    const resourcesDir = path.dirname(outPath);
    if (!fs.existsSync(resourcesDir)) {
        fs.mkdirSync(resourcesDir);
    }

    fs.writeFileSync(outPath, buffer);
    console.log(`SUCCESS: Icon generated at: ${outPath}`);

} catch (error) {
    console.error("FATAL ERROR in generate_icon_v2.js:");
    console.error(error);
    process.exit(1);
}
