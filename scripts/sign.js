#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// Configuration
const CONFIG = {
    // PKCS#11 settings
    pkcs11Module: process.env.PKCS11_MODULE || '/Library/OpenSC/lib/opensc-pkcs11.so',
    pkcs11Engine: process.env.PKCS11_ENGINE || '/usr/local/lib/opensc-pkcs11.so',
    pkcs11SlotId: process.env.PKCS11_SLOT_ID || '0',
    pkcs11Pin: process.env.PKCS11_PIN || '',
    pkcs11KeyLabel: process.env.PKCS11_KEY_LABEL || '',
    macOsCertFile: process.env.MACOS_CERT_FILE || './scripts/cert-apple.crt',
    windowsCertFile: process.env.WINDOWS_CERT_FILE || './scripts/cert-windows.crt',

    // Signing settings
    skipSigning: process.env.SKIP_SIGNING === 'true',
    ciOnly: process.env.CI_ONLY_SIGNING === 'true',

    // Platform-specific settings
    darwin: {
        enabled: true,
        requireHardwareToken: true
    },
    win32: {
        enabled: true,
        requireHardwareToken: true
    },
    linux: {
        enabled: false
    }
};

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Helper function to prompt user for input
function promptUser(question, defaultValue = '') {
    return new Promise((resolve) => {
        const prompt = defaultValue ? `${question} (default: ${defaultValue}): ` : `${question}: `;
        rl.question(prompt, (answer) => {
            resolve(answer.trim() || defaultValue);
        });
    });
}

// Helper function to extract common name from certificate
async function extractCommonNameFromCertificate(certPath) {
    try {
        if (!fs.existsSync(certPath)) {
            log(`Certificate file not found: ${certPath}`, 'warn');
            return '';
        }

        // Extract subject from certificate using OpenSSL
        const output = execSync(`openssl x509 -in "${certPath}" -noout -subject`, { encoding: 'utf8' });
        const subject = output.trim();

        // Extract common name (CN) from subject
        const cnMatch = subject.match(/CN=([^,]+)/);
        if (cnMatch) {
            return cnMatch[1];
        }

        log(`Could not extract CN from certificate: ${subject}`, 'warn');
        return '';
    } catch (error) {
        log(`Failed to read certificate: ${error.message}`, 'warn');
        return '';
    }
}


// Helper function to log with timestamp
function log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : '';
    console.log(`[${timestamp}] ${prefix} ${message}`);
}

// Global variable to store interactive configuration
let interactiveConfig = null;

// Function to gather configuration interactively
async function gatherInteractiveConfig(configuration) {
    if (interactiveConfig) {
        return interactiveConfig;
    }

    const platform = configuration.platform;
    const filePath = configuration.path || configuration.app;

    console.log(`Platform: ${platform}`);
    console.log(`File:     ${filePath}\n`);

    const config = {
        pkcs11Module: await promptUser('PKCS#11 module path', CONFIG.pkcs11Module),
        pkcs11Engine: await promptUser('PKCS#11 engine path', CONFIG.pkcs11Engine),
        pkcs11SlotId: await promptUser('PKCS#11 slot ID', CONFIG.pkcs11SlotId),
        pkcs11Pin: await promptUser('PKCS#11 PIN', CONFIG.pkcs11Pin),
        macOsCertFile: '',
        windowsCertFile: '',
        pkcs11KeyLabel: ''
    };

    while(!config.pkcs11Pin) {
        config.pkcs11Pin = await promptUser('PKCS#11 PIN (required)', CONFIG.pkcs11Pin);
    }

    // Ask for platform-specific certificate files
    if (platform === 'darwin' && !config.macOsCertFile) {
        config.macOsCertFile = await promptUser('macOS certificate file path', CONFIG.macOsCertFile);
    } else if (platform === 'win32' && !config.windowsCertFile) {
        config.windowsCertFile = await promptUser('Windows certificate file path', CONFIG.windowsCertFile);
    }

    // Extract common name from certificate and offer as signing name
    if (config.macOsCertFile || config.windowsCertFile) {
        console.log('\n  Extracting information from certificate...');
        const certFile = platform === 'darwin' ? config.macOsCertFile : config.windowsCertFile;
        const commonName = await extractCommonNameFromCertificate(certFile);

        if (commonName) {
            console.log(`Found certificate CN: ${commonName}`);
            config.pkcs11KeyLabel = await promptUser('PKCS#11 key label (signing name)', commonName);
        } else {
            config.pkcs11KeyLabel = await promptUser('PKCS#11 key label (signing name)', '');
        }
    } else {
        config.pkcs11KeyLabel = await promptUser('PKCS#11 key label (signing name)', '');
    }

    while (!config.pkcs11KeyLabel) {
        config.pkcs11KeyLabel = await promptUser('PKCS#11 key label (signing name)', '');
    }

    console.log('\n✅ Configuration complete!\n');

    // Store for reuse
    interactiveConfig = config;
    return config;
}

// Helper function to check if we should sign
function shouldSign(configuration) {
    // Skip if explicitly disabled
    if (CONFIG.skipSigning) {
        log('Signing disabled via SKIP_SIGNING environment variable', 'warn');
        return false;
    }

    // Skip if CI-only mode and not in CI
    if (CONFIG.ciOnly && !process.env.CI) {
        log('Skipping signing - not in CI environment', 'warn');
        return false;
    }

     // Get file path from configuration (could be 'path' or 'app')
     const filePath = configuration.path || configuration.app;
     
     // Determine platform from file path if not provided
     let platform = configuration.platform;
     if (!platform && filePath) {
         if (filePath.endsWith('.exe')) {
             platform = 'win32';
         } else if (filePath.endsWith('.app')) {
             platform = 'darwin';
         } else if (filePath.endsWith('.dmg')) {
             platform = 'darwin';
         } else if (filePath.endsWith('.AppImage')) {
             platform = 'linux';
         }
     }

     if (!CONFIG[platform] || !CONFIG[platform].enabled) {
         log(`Signing not supported for platform: ${platform}`, 'warn');
         return false;
     }

     // Check if file exists
     if (!filePath || !fs.existsSync(filePath)) {
         log(`File not found: ${filePath}`, 'error');
         return false;
     }

    return true;
}

// macOS signing function
async function signMacOS(configuration) {
    const filePath = configuration.path || configuration.app;
    const fileName = path.basename(filePath);

    log(`Signing macOS file: ${fileName}`);

    // Get interactive configuration
    configuration.platform = 'darwin';
    const config = await gatherInteractiveConfig(configuration);


    // Check if it's a .app bundle or DMG
    if (filePath.endsWith('.app')) {
        return await signMacApp(filePath, config);
    } else if (filePath.endsWith('.dmg')) {
        return await signMacDMG(filePath);
    } else {
        log(`Unsupported macOS file type: ${fileName}`, 'warn');
        return false;
    }
}

// Sign macOS .app bundle
async function signMacApp(appPath, config) {
    try {
        // Build rcodesign command
        const command = [
            'rcodesign sign',
            `--pkcs11-library "${config.pkcs11Module}"`,
            `--pkcs11-slot-id ${config.pkcs11SlotId}`,
            `--pkcs11-pin "${config.pkcs11Pin}"`,
            `--pkcs11-certificate-file "${config.macOsCertFile}"`,
            `--pkcs11-key-label "${config.pkcs11KeyLabel}"`,
            `"${appPath}"`
        ].join(' ');

        log(`Executing: ${command}`);
        execSync(command, { stdio: 'inherit' });

        log(`Successfully signed macOS app: ${path.basename(appPath)}`);
        return true;
    } catch (error) {
        log(`Failed to sign macOS app: ${error.message}`, 'error');
        return false;
    }
}

// Sign macOS DMG
async function signMacDMG(dmgPath) {
    try {
        // For DMG files, we typically don't need to sign them if the .app inside is already signed
        log(`DMG file detected: ${path.basename(dmgPath)} - skipping (app should be pre-signed)`);
        return true;
    } catch (error) {
        log(`Failed to process DMG: ${error.message}`, 'error');
        return false;
    }
}

// Windows signing function
async function signWindows(configuration) {
    const filePath = configuration.path || configuration.app;
    const fileName = path.basename(filePath);

    log(`Signing Windows file: ${fileName}`);

    // Get interactive configuration
    configuration.platform = 'win32';
    const config = await gatherInteractiveConfig(configuration);

    // Only sign specific files to avoid double signing
    const shouldSignFile = fileName.endsWith('.exe') && (
        fileName.includes('Advanced MTR') ||
        fileName.includes('advanced-mtr') ||
        fileName === 'Advanced MTR.exe'
    );

    if (!shouldSignFile) {
        log(`Skipping Windows file (not main executable): ${fileName}`, 'warn');
        return true;
    }


    try {
        // Create temporary PKCS#11 configuration file
        const pkcs11ConfigPath = '/tmp/pkcs11.conf';
        const pkcs11Config = `name = OpenSC
library = ${config.pkcs11Module}
slot = ${config.pkcs11SlotId}`;

        if (fs.existsSync(pkcs11ConfigPath)) {
            fs.unlinkSync(pkcs11ConfigPath);
        }
        fs.writeFileSync(pkcs11ConfigPath, pkcs11Config);

        // Use jsign for Windows signing with PKCS#11
        const command = [
            'jsign',
            `--keystore "${pkcs11ConfigPath}"`,
            `--storetype PKCS11`,
            `--storepass "${config.pkcs11Pin}"`,
            `--alias "${config.pkcs11KeyLabel}"`,
            `--tsaurl http://timestamp.digicert.com`,
            `"${filePath}"`
        ].join(' ');

        log(`Executing: ${command}`);
        execSync(command, { stdio: 'inherit' });

        // Clean up temporary config file
        fs.unlinkSync(pkcs11ConfigPath);

        log(`Successfully signed Windows file: ${fileName}`);
        return true;
    } catch (error) {
        log(`Failed to sign Windows file: ${error.message}`, 'error');
        return false;
    }
}

// Main signing function
async function signFile(configuration) {
    // Get file path from configuration (could be 'path' or 'app')
    const filePath = configuration.path || configuration.app;
    
    // Determine platform from file path if not provided
    let platform = configuration.platform;
    if (!platform && filePath) {
        if (filePath.includes('win-') || filePath.includes('.exe')) {
            platform = 'win32';
        } else if (filePath.includes('mac') || filePath.includes('.app')) {
            platform = 'darwin';
        } else if (filePath.includes('linux') || filePath.includes('.AppImage')) {
            platform = 'linux';
        }
    }

    log(`Processing ${platform} file: ${filePath}`);

    switch (platform) {
        case 'darwin':
            return await signMacOS(configuration);
        case 'win32':
            return await signWindows(configuration);
        case 'linux':
            log('Linux signing not implemented', 'warn');
            return true;
        default:
            log(`Unknown platform: ${platform}`, 'warn');
            return true;
    }
}

// Main export function for electron-builder
exports.default = async function (configuration) {
    log('Custom sign script started');
    //log(`Configuration: ${JSON.stringify(configuration, null, 2)}`);

    try {
        // Check if we should sign this file
        if (!shouldSign(configuration)) {
            return;
        }

        // Perform signing
        const success = await signFile(configuration);

        if (!success) {
            log('Signing failed', 'error');
            throw new Error(`Failed to sign ${configuration.path}`);
        }

        log('Custom sign script completed successfully');
    } catch (error) {
        log(`Signing error: ${error.message}`, 'error');
        throw error;
    } finally {
        // Close readline interface if it was opened
        if (rl && !rl.closed) {
            rl.close();
        }
    }
};
