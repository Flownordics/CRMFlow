/**
 * Production Build Script
 * Optimized build process for Netlify deployment
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Starting production build...');

try {
    // 1. Clean previous builds
    console.log('🧹 Cleaning previous builds...');
    if (fs.existsSync('dist')) {
        fs.rmSync('dist', { recursive: true, force: true });
    }

    // 2. Type check
    console.log('🔍 Running type check...');
    execSync('npm run typecheck', { stdio: 'inherit' });

    // 3. Lint check
    console.log('🔍 Running linter...');
    execSync('npm run lint', { stdio: 'inherit' });

    // 4. Run tests
    console.log('🧪 Running tests...');
    execSync('npm run test', { stdio: 'inherit' });

    // 5. Build application
    console.log('🏗️ Building application...');
    execSync('npm run build', { stdio: 'inherit' });

    // 6. Verify build output
    console.log('✅ Verifying build output...');
    const distPath = path.join(process.cwd(), 'dist');
    if (!fs.existsSync(distPath)) {
        throw new Error('Build output directory not found');
    }

    const indexHtml = path.join(distPath, 'index.html');
    if (!fs.existsSync(indexHtml)) {
        throw new Error('index.html not found in build output');
    }

    // 7. Check bundle size
    console.log('📊 Analyzing bundle size...');
    const assetsPath = path.join(distPath, 'assets');
    if (fs.existsSync(assetsPath)) {
        const assets = fs.readdirSync(assetsPath);
        let totalSize = 0;

        assets.forEach(asset => {
            const assetPath = path.join(assetsPath, asset);
            const stats = fs.statSync(assetPath);
            totalSize += stats.size;
        });

        console.log(`📦 Total bundle size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

        if (totalSize > 5 * 1024 * 1024) { // 5MB
            console.warn('⚠️ Bundle size is large, consider code splitting');
        }
    }

    // 8. Create deployment info
    console.log('📝 Creating deployment info...');
    const deploymentInfo = {
        timestamp: new Date().toISOString(),
        buildVersion: process.env.BUILD_VERSION || '1.0.0',
        nodeVersion: process.version,
        buildCommand: 'npm run build',
        features: [
            'TypeScript',
            'React 18',
            'Vite',
            'Tailwind CSS',
            'Supabase',
            'React Query',
            'Code Splitting',
            'Performance Monitoring',
            'Error Recovery',
            'Memory Management'
        ],
        optimizations: [
            'Bundle optimization',
            'Query prefetching',
            'Smart caching',
            'Error boundaries',
            'Memory leak prevention',
            'Performance monitoring'
        ]
    };

    fs.writeFileSync(
        path.join(distPath, 'deployment-info.json'),
        JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('✅ Production build completed successfully!');
    console.log('🚀 Ready for Netlify deployment');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Deploy to Netlify: netlify deploy --prod');
    console.log('2. Verify deployment: Check application loads correctly');
    console.log('3. Monitor performance: Check /performance dashboard');
    console.log('4. Test functionality: Verify all features work');

} catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
}
