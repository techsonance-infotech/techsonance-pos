const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs-extra');

const templatePath = path.join(__dirname, 'template.db');
const dbUrl = `file:${templatePath}`;

console.log('Generating template.db at:', templatePath);

try {
    // Ensure clean state
    if (fs.existsSync(templatePath)) {
        fs.unlinkSync(templatePath);
    }

    // Push schema
    execSync(`SQLITE_DATABASE_URL="${dbUrl}" npx prisma db push --schema=prisma/schema.prisma --skip-generate --accept-data-loss`, {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit',
        env: { ...process.env, SQLITE_DATABASE_URL: dbUrl }
    });

    // Seed
    execSync(`SQLITE_DATABASE_URL="${dbUrl}" npx prisma db seed`, {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit',
        env: { ...process.env, SQLITE_DATABASE_URL: dbUrl }
    });

    console.log('✅ template.db generated successfully.');
} catch (e) {
    console.error('❌ Failed to generate template.db:', e);
    process.exit(1);
}
