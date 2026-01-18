#!/usr/bin/env node
/**
 * Script de test pour l'API REST de la Serre Connectée
 * Teste tous les endpoints et les cas de sécurité
 */

require('dotenv').config();

const http = require('http');
const assert = require('assert');

const API_BASE = process.env.API_BASE || 'http://domorasp:1880';
const API_TOKEN = process.env.API_TOKEN || 'SUPER_SECRET_TOKEN';
const BEARER_TOKEN = `Bearer ${API_TOKEN}`;

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// Utility fonction pour faire des requêtes HTTP
function makeRequest(method, path, headers = {}, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(API_BASE + path);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = data ? JSON.parse(data) : {};
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: json
                    });
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: data
                    });
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

// Test helper
async function test(name, fn) {
    totalTests++;
    try {
        await fn();
        passedTests++;
        console.log(`  ✓ ${name}`);
    } catch (err) {
        failedTests++;
        console.error(`  ✗ ${name}`);
        console.error(`    ${err.message}`);
    }
}

// Main test suite
async function runTests() {
    console.log('='.repeat(70));
    console.log('API REST SERRE CONNECTÉE - TEST SUITE');
    console.log('='.repeat(70));
    console.log(`\nConfiguration:`);
    console.log(`  API: ${API_BASE}`);
    console.log(`  Token: ${API_TOKEN.substring(0, 10)}...`);
    console.log('');

    // ==================== AUTHENTICATION TESTS ====================
    console.log('🔐 AUTHENTICATION TESTS');
    console.log('-'.repeat(70));

    await test('GET /api/status avec token valide → 200', async () => {
        const res = await makeRequest('GET', '/api/status', { 'Authorization': BEARER_TOKEN });
        assert.strictEqual(res.statusCode, 200, `Expected 200, got ${res.statusCode}`);
        assert(res.body.uptime !== undefined, 'Missing uptime');
        assert(res.body.failsafe !== undefined, 'Missing failsafe');
    });

    await test('GET /api/status sans token → 401', async () => {
        const res = await makeRequest('GET', '/api/status');
        assert.strictEqual(res.statusCode, 401, `Expected 401, got ${res.statusCode}`);
        assert.strictEqual(res.body.error, 'Unauthorized');
    });

    await test('GET /api/status avec token invalide → 401', async () => {
        const res = await makeRequest('GET', '/api/status', { 'Authorization': 'Bearer invalid-token' });
        assert.strictEqual(res.statusCode, 401, `Expected 401, got ${res.statusCode}`);
    });

    // ==================== GET ENDPOINTS ====================
    console.log('\n📖 GET ENDPOINTS');
    console.log('-'.repeat(70));

    await test('GET /api/sensors → 200', async () => {
        const res = await makeRequest('GET', '/api/sensors', { 'Authorization': BEARER_TOKEN });
        assert.strictEqual(res.statusCode, 200);
        assert(res.body.air !== undefined);
        assert(res.body.soil !== undefined);
    });

    await test('GET /api/actuators → 200', async () => {
        const res = await makeRequest('GET', '/api/actuators', { 'Authorization': BEARER_TOKEN });
        assert.strictEqual(res.statusCode, 200);
        assert(Array.isArray(res.body.actuators));
        assert(res.body.count >= 0);
    });

    // ==================== VALIDATION TESTS ====================
    console.log('\n✔️  VALIDATION TESTS');
    console.log('-'.repeat(70));

    await test('POST /api/actuators avec nom invalide → 400', async () => {
        const res = await makeRequest('POST', '/api/actuators/invalid_actuator', 
            { 'Authorization': BEARER_TOKEN }, 
            { state: 'ON' });
        assert.strictEqual(res.statusCode, 400, `Expected 400, got ${res.statusCode}`);
        assert.strictEqual(res.body.error, 'Invalid actuator name');
    });

    await test('POST /api/actuators avec état invalide (minuscule) → 400', async () => {
        const res = await makeRequest('POST', '/api/actuators/lampe',
            { 'Authorization': BEARER_TOKEN },
            { state: 'on' }); // lowercase = invalid
        assert.strictEqual(res.statusCode, 400, `Expected 400, got ${res.statusCode}`);
    });

    await test('POST /api/culture/phase avec phase invalide → 400', async () => {
        const res = await makeRequest('POST', '/api/culture/phase',
            { 'Authorization': BEARER_TOKEN },
            { phase: 'invalid_phase' });
        assert.strictEqual(res.statusCode, 400);
        assert(res.body.error);
    });

    await test('POST /api/override avec target invalide → 400', async () => {
        const res = await makeRequest('POST', '/api/override',
            { 'Authorization': BEARER_TOKEN },
            { target: 'invalid', state: true });
        assert.strictEqual(res.statusCode, 400);
    });

    await test('POST /api/override avec state non-booléen → 400', async () => {
        const res = await makeRequest('POST', '/api/override',
            { 'Authorization': BEARER_TOKEN },
            { target: 'climat', state: 'yes' }); // string = invalid
        assert.strictEqual(res.statusCode, 400);
    });

    // ==================== SECURITY HEADERS ====================
    console.log('\n🛡️  SECURITY HEADERS');
    console.log('-'.repeat(70));

    await test('Réponses incluent X-Content-Type-Options', async () => {
        const res = await makeRequest('GET', '/api/status', { 'Authorization': BEARER_TOKEN });
        assert(res.headers['x-content-type-options'], 'Missing X-Content-Type-Options header');
        assert.strictEqual(res.headers['x-content-type-options'], 'nosniff');
    });

    await test('Réponses incluent X-Frame-Options', async () => {
        const res = await makeRequest('GET', '/api/status', { 'Authorization': BEARER_TOKEN });
        assert(res.headers['x-frame-options'], 'Missing X-Frame-Options header');
        assert.strictEqual(res.headers['x-frame-options'], 'DENY');
    });

    await test('Réponses incluent Content-Type: application/json', async () => {
        const res = await makeRequest('GET', '/api/status', { 'Authorization': BEARER_TOKEN });
        assert(res.headers['content-type'].includes('application/json'));
    });

    // ==================== TIMESTAMPS ====================
    console.log('\n⏰ TIMESTAMPS');
    console.log('-'.repeat(70));

    await test('GET /api/status inclut timestamp ISO', async () => {
        const res = await makeRequest('GET', '/api/status', { 'Authorization': BEARER_TOKEN });
        assert(res.body.timestamp, 'Missing timestamp');
        const date = new Date(res.body.timestamp);
        assert(!isNaN(date.getTime()), 'Invalid timestamp format');
    });

    await test('Erreur 401 inclut timestamp', async () => {
        const res = await makeRequest('GET', '/api/status');
        assert.strictEqual(res.statusCode, 401);
        assert(res.body.timestamp, 'Missing timestamp on error');
    });

    // ==================== RESPONSE FORMAT ====================
    console.log('\n📦 RESPONSE FORMAT');
    console.log('-'.repeat(70));

    await test('GET /api/status retourne failsafe object', async () => {
        const res = await makeRequest('GET', '/api/status', { 'Authorization': BEARER_TOKEN });
        assert(res.body.failsafe.global !== undefined);
        assert(res.body.failsafe.climat !== undefined);
        assert(res.body.failsafe.arrosage !== undefined);
    });

    await test('GET /api/sensors retourne air & soil', async () => {
        const res = await makeRequest('GET', '/api/sensors', { 'Authorization': BEARER_TOKEN });
        assert(res.body.air !== undefined);
        assert(res.body.air.temperature !== undefined);
        assert(res.body.air.humidity !== undefined);
        assert(res.body.soil !== undefined);
        assert(res.body.soil.humidity !== undefined);
    });

    await test('GET /api/actuators retourne liste avec count', async () => {
        const res = await makeRequest('GET', '/api/actuators', { 'Authorization': BEARER_TOKEN });
        assert(Array.isArray(res.body.actuators));
        assert(typeof res.body.count === 'number');
        assert.strictEqual(res.body.count, res.body.actuators.length);
    });

    // ==================== SUMMARY ====================
    console.log('\n' + '='.repeat(70));
    console.log('TEST SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total:  ${totalTests}`);
    console.log(`Passed: ${passedTests} ✓`);
    console.log(`Failed: ${failedTests} ✗`);
    
    if (failedTests === 0) {
        console.log('\n✅ TOUS LES TESTS PASSÉS');
    } else {
        console.log(`\n❌ ${failedTests} ERREUR(S) DÉTECTÉE(S)`);
        process.exit(1);
    }
}

// Run tests
runTests().catch(err => {
    console.error('ERREUR FATALE:', err.message);
    process.exit(1);
});
