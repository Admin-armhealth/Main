
const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying File Content Integrity...');

const promptsPath = path.join('src', 'lib', 'prompts.ts');
const routePath = path.join('src', 'app', 'api', 'preauth', 'route.ts');
const dashboardPath = path.join('src', 'components', 'ApprovalDashboard.tsx');

// Check Prompts
try {
    const prompts = fs.readFileSync(promptsPath, 'utf8');
    if (prompts.includes('AETNA STYLE GUIDE') && prompts.includes('approval_likelihood')) {
        console.log('   ✅ src/lib/prompts.ts: Contains Payer Guides & Approval Logic');
    } else {
        console.error('   ❌ src/lib/prompts.ts: Missing critical logic strings.');
    }
} catch (e) {
    console.error('   ❌ Failed to read prompts.ts', e.message);
}

// Check Route
try {
    const route = fs.readFileSync(routePath, 'utf8');
    if (route.includes('approval_likelihood') && route.includes('checklist')) {
        console.log('   ✅ src/app/api/preauth/route.ts: Contains Parsing Logic');
    } else {
        console.error('   ❌ src/app/api/preauth/route.ts: Missing parsing logic.');
    }
} catch (e) {
    console.error('   ❌ Failed to read route.ts', e.message);
}

// Check Dashboard
if (fs.existsSync(dashboardPath)) {
    console.log('   ✅ src/components/ApprovalDashboard.tsx: Exists');
} else {
    console.error('   ❌ src/components/ApprovalDashboard.tsx: MISSING');
}
