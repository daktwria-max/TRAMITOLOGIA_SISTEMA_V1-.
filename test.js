console.log('--- TEST START ---');
try {
    const { app } = require('electron');
    console.log('Electron require success');
    console.log('App version:', app.getVersion());
    app.quit();
} catch (e) {
    console.error('Error:', e);
}
console.log('--- TEST END ---');
