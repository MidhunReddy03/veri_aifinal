const fs = require('fs');
let css = fs.readFileSync('frontend/src/style.css', 'utf8');
css = css.replace('.glowing-title {', '.glowing-title {\n  position: absolute;\n  top: 15%;\n  z-index: 100;');
fs.writeFileSync('frontend/src/style.css', css);
