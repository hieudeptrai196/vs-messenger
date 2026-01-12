import * as vscode from 'vscode';
import * as puppeteer from 'puppeteer';
import * as WebSocket from 'ws';
import * as path from 'path';
import * as os from 'os';

let isSecondary = false;

let browserInstance: puppeteer.Browser | null = null;
let pageInstance: puppeteer.Page | null = null;
let wss: WebSocket.Server | null = null;
let activeWs: WebSocket | null = null;
let activeCdp: puppeteer.CDPSession | null = null;

export function activate(context: vscode.ExtensionContext) {
    console.log('VS Messenger activated');

    // Start WS Server
    wss = new WebSocket.Server({ port: 0 }); // Random port
    wss.on('connection', (ws) => {
        handleConnection(ws);
    });

    const addr = wss.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    console.log(`Streaming server running on port ${port}`);

    const provider = new RemoteBrowserProvider(context.extensionUri, port);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(RemoteBrowserProvider.viewType, provider)
    );
}

export function deactivate() {
    if (browserInstance) {
        browserInstance.close();
    }
    if (wss) {
        wss.close();
    }
}

async function handleConnection(ws: WebSocket) {
    console.log('Client connected');
    activeWs = ws;

    try {
        if (!browserInstance) {
            // Persist session data
            const userDataDir = path.join(os.homedir(), '.gemini', 'vsmessenger-profile');
            browserInstance = await puppeteer.launch({
                headless: true,
                userDataDir: userDataDir,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-blink-features=AutomationControlled'
                ]
            });

            const pages = await browserInstance.pages();
            pageInstance = pages.length > 0 ? pages[0] : await browserInstance.newPage();

            // Navigation Listener for Login Status
            pageInstance.on('framenavigated', async (frame) => {
                if (frame === pageInstance?.mainFrame() && activeWs?.readyState === WebSocket.OPEN) {
                    const url = frame.url();
                    // Broader check: messenger.com without 'login'
                    const isLoggedIn = (url.includes('messenger.com') && !url.includes('login') && !url.includes('checkpoint')) || (url.includes('facebook.com') && !url.includes('login') && !url.includes('checkpoint'));
                    activeWs.send(JSON.stringify({ type: 'status', loggedIn: isLoggedIn }));
                }
            });

            await pageInstance.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            // Initial: Narrow width to trigger responsive layout (like phone/tablet)
            await pageInstance.setViewport({ width: 450, height: 800 });
            await pageInstance.goto('https://www.messenger.com/');
        } else {
            // ...
        }

        // Send initial status
        if (ws.readyState === WebSocket.OPEN) {
            const url = pageInstance!.url();
            const isLoggedIn = (url.includes('messenger.com') && !url.includes('login') && !url.includes('checkpoint')) || (url.includes('facebook.com') && !url.includes('login') && !url.includes('checkpoint'));
            ws.send(JSON.stringify({ type: 'status', loggedIn: isLoggedIn }));
        }

        // Cleanup previous CDP session if exists
        if (activeCdp) {
            try { await activeCdp.detach(); } catch (e) { }
        }

        const client = await pageInstance!.target().createCDPSession();
        activeCdp = client;

        await client.send('Page.startScreencast', { format: 'jpeg', quality: 50, everyNthFrame: 1 });

        client.on('Page.screencastFrame', async (frame) => {
            if (activeWs === ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'frame', data: frame.data }));
                try {
                    await client.send('Page.screencastFrameAck', { sessionId: frame.sessionId });
                } catch (e) { }
            }
        });

        ws.on('close', async () => {
            console.log('Client disconnected, cleaning up resources');
            try {
                await client.send('Page.stopScreencast');
                await client.detach();
            } catch (e) { }
            if (activeCdp === client) activeCdp = null;
            if (activeWs === ws) activeWs = null;
        });

        ws.on('message', async (message) => {
            if (!pageInstance) return;
            const msg = JSON.parse(message.toString());

            try {
                if (msg.type === 'click') {
                    await pageInstance.mouse.click(msg.x, msg.y);
                } else if (msg.type === 'scroll') {
                    await pageInstance.mouse.wheel({ deltaY: msg.dy });
                } else if (msg.type === 'toggle-position') {
                    // Revert to simple global toggle as requested
                    vscode.commands.executeCommand('workbench.action.toggleSidebarPosition');
                } else if (msg.type === 'reload') {
                    await pageInstance.reload();
                } else if (msg.type === 'key') {
                    try {
                        if (msg.modifiers && msg.modifiers.length > 0) {
                            for (const mod of msg.modifiers) await pageInstance.keyboard.down(mod);
                            await pageInstance.keyboard.press(msg.key);
                            for (let i = msg.modifiers.length - 1; i >= 0; i--) {
                                await pageInstance.keyboard.up(msg.modifiers[i]);
                            }
                        } else {
                            await pageInstance.keyboard.press(msg.key);
                        }
                    } catch (e) {
                        // Fallback
                        await pageInstance.keyboard.press(msg.key);
                    }
                } else if (msg.type === 'type') {
                    try {
                        await pageInstance.evaluate((text) => {
                            document.execCommand('insertText', false, text);
                        }, msg.text);
                    } catch (e) {
                        await pageInstance.keyboard.type(msg.text);
                    }
                } else if (msg.type === 'resize') {
                    await pageInstance.setViewport({ width: msg.width, height: msg.height });
                } else if (msg.type === 'autologin') {
                    console.log('Attempting auto-login for:', msg.email);
                    try {
                        // Desktop Selectors
                        const emailSelector = '#email';
                        const passSelector = '#pass';
                        const loginBtnSelector = '#loginbutton';

                        await pageInstance.waitForSelector(emailSelector, { timeout: 5000 });

                        await pageInstance.evaluate((sel: string) => {
                            const el = document.querySelector(sel) as HTMLInputElement;
                            if (el) el.value = '';
                        }, emailSelector);
                        await pageInstance.type(emailSelector, msg.email);

                        await pageInstance.evaluate((sel: string) => {
                            const el = document.querySelector(sel) as HTMLInputElement;
                            if (el) el.value = '';
                        }, passSelector);
                        await pageInstance.type(passSelector, msg.pass);

                        try {
                            await pageInstance.click(loginBtnSelector);
                        } catch (e) {
                            await pageInstance.keyboard.press('Enter');
                        }

                    } catch (err) {
                        console.error('Auto login failed', err);
                    }
                }
            } catch (err) {
                console.error('Action error', err);
            }
        });
    } catch (e) {
        console.error('Puppeteer error', e);
    }
}

class RemoteBrowserProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'vsmessenger.view';

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _port: number
    ) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <style>
                    body { margin: 0; padding: 0; display: flex; flex-direction: column; height: 100vh; overflow: hidden; background: #333; font-family: sans-serif; }
                    .login-bar { display: flex; flex-direction: column; padding: 10px; background: #444; gap: 8px; border-bottom: 1px solid #555; position: relative; z-index: 200; }
                    .login-row { display: flex; gap: 5px; }
                    input { flex: 1; padding: 6px; border-radius: 4px; border: 1px solid #666; background: #222; color: white; }
                    button { padding: 6px 12px; background: #0084ff; border: none; border-radius: 4px; color: white; cursor: pointer; font-weight: bold; }
                    button:hover { background: #006bcf; }
                    
                    /* View container - Always visible */
                    #view-container { 
                        position: relative; overflow: hidden; 
                        flex: 1; 
                        display: flex; flex-direction: column;
                        background: #000;
                    }
                    #screen { width: 100%; object-fit: contain; flex: 1; min-height: 0; }
                    
                    /* Loader */
                    #loader {
                        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                        background: #000; display: flex; align-items: center; justify-content: center;
                        z-index: 50;
                    }
                    .spinner {
                        border: 3px solid #333; border-top: 3px solid #0084ff; border-radius: 50%;
                        width: 24px; height: 24px; animation: spin 0.8s linear infinite;
                    }
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                </style>
            </head>
            <body>


                <div id="view-container">
                    <div id="loader"><div class="spinner"></div></div>
                    <img id="screen" src="" />
                     <div id="reload-btn" style="position: absolute; top:0; right:0; background:rgba(0,0,0,0.5); color: #ccc; padding: 4px 8px; font-size: 14px; cursor: pointer; border-bottom-left-radius: 4px; z-index: 100;">↻</div>
                     <div id="toggle-side-btn" style="position: absolute; top:0; right: 35px; background:rgba(0,0,0,0.5); color: #ccc; padding: 4px 8px; font-size: 14px; cursor: pointer; border-bottom-left-radius: 4px; border-bottom-right-radius: 4px; z-index: 100;">⇆</div>

                     <!-- Trap input: Fixed but transparent -->
                     <input id="input-trap" type="text" autocomplete="off" style="position:fixed; top:0; left:0; width: 100%; height: 100%; opacity: 0; z-index: 90; cursor: default;" />
                </div>
                
                <script>
                    const vscode = acquireVsCodeApi();
                    const ws = new WebSocket('ws://localhost:${this._port}');
                    
                    const img = document.getElementById('screen');
                    const loader = document.getElementById('loader');
                    const reloadBtn = document.getElementById('reload-btn');
                    const toggleSideBtn = document.getElementById('toggle-side-btn');
                    const inputTrap = document.getElementById('input-trap');

                    const SCALE_FACTOR = 1.0; 
                    let isComposing = false; 
                    let pendingEnter = false;

                    // WS Setup
                    const updateSize = () => {
                        const container = document.getElementById('view-container');
                        if(ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({ 
                                type: 'resize', 
                                width: Math.floor(container.clientWidth * SCALE_FACTOR), 
                                height: Math.floor(container.clientHeight * SCALE_FACTOR) 
                            }));
                        }
                    };

                    ws.onopen = () => {
                        console.log('Connected');
                        setTimeout(updateSize, 100); 
                    };

                    ws.onmessage = (event) => {
                        const msg = JSON.parse(event.data);
                        if (msg.type === 'frame') {
                            img.src = 'data:image/jpeg;base64,' + msg.data;
                            // Hide loader on first frame
                            if (loader.style.display !== 'none') loader.style.display = 'none';
                        }
                    };
                    

                    // Mouse Interaction
                    // We let clicks pass through the input trap using standard event behavior or by manually calculating
                    // Since input trap covers screen, clicks hit it first.
                    inputTrap.addEventListener('mousedown', (e) => {
                        // Reset composing on new interactions
                        isComposing = false;
                        
                        // Forward click to backend
                        const rect = img.getBoundingClientRect(); 
                        
                        // Calculate the actual displayed image area (accounting for object-fit: contain)
                        const naturalWidth = img.naturalWidth || 450;
                        const naturalHeight = img.naturalHeight || 800;
                        const clientWidth = rect.width;
                        const clientHeight = rect.height;

                        const ratioX = clientWidth / naturalWidth;
                        const ratioY = clientHeight / naturalHeight;
                        const scale = Math.min(ratioX, ratioY);

                        const displayedWidth = naturalWidth * scale;
                        const displayedHeight = naturalHeight * scale;

                        const offsetX = (clientWidth - displayedWidth) / 2;
                        const offsetY = (clientHeight - displayedHeight) / 2;

                        // Click relative to the image element
                        const elementX = e.clientX - rect.left;
                        const elementY = e.clientY - rect.top;

                        // Click relative to the displayed content (viewport)
                        const contentX = elementX - offsetX;
                        const contentY = elementY - offsetY;

                        // Check if click is inside the displayed content
                        if (contentX >= 0 && contentX <= displayedWidth && contentY >= 0 && contentY <= displayedHeight) {
                            // Map back to backend viewport coordinates
                            const backendX = Math.round(contentX / scale);
                            const backendY = Math.round(contentY / scale);

                            if (ws.readyState === WebSocket.OPEN) {
                                ws.send(JSON.stringify({ 
                                    type: 'click', 
                                    x: backendX, 
                                    y: backendY 
                                }));
                            }
                        }
                        
                        // Ensure focus stays on this trap
                        setTimeout(() => inputTrap.focus(), 10);
                    });

                    // Scroll
                    window.addEventListener('wheel', (e) => {
                         if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({ type: 'scroll', dy: e.deltaY }));
                        }
                    });

                    // KEYBOARD HANDLING
                    inputTrap.addEventListener('compositionstart', () => { 
                        isComposing = true; 
                        pendingEnter = false;
                    });
                    
                    inputTrap.addEventListener('compositionend', (e) => { 
                        isComposing = false;
                        const text = e.data || inputTrap.value;
                        if (text && ws.readyState === WebSocket.OPEN) {
                             ws.send(JSON.stringify({ type: 'type', text: text }));
                        }
                        
                        if (pendingEnter) {
                             if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'key', key: 'Enter' }));
                             pendingEnter = false;
                        }
                        inputTrap.value = '';
                    });

                    inputTrap.addEventListener('input', (e) => {
                        if (isComposing) return;
                        
                        const char = e.data;
                        if(char && ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({ type: 'type', text: char }));
                        }
                        inputTrap.value = '';
                    });

                    // Functional Keys
                    inputTrap.addEventListener('keydown', (e) => {
                         if (isComposing) {
                             if (e.key === 'Enter') pendingEnter = true;
                             return;
                         }
                         const key = e.key;
                         
                         if (key === 'Backspace') {
                             if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'key', key: 'Backspace' }));
                             return;
                         }

                         if (key.length > 1 || key === 'Enter' || key === 'Tab' || e.ctrlKey || e.metaKey) {
                             if (ws.readyState === WebSocket.OPEN) {
                                ws.send(JSON.stringify({ type: 'key', key: key }));
                             }
                         }
                    });
                    
                    // Focus safety: If user clicks elsewhere (like login bar), we shouldn't steal focus hard,
                    // but if they click 'view-container', they hit the trap so focus is automatic.

                    // Safety: Reset composing if focus lost
                    inputTrap.addEventListener('blur', () => { isComposing = false; });


                    
                    // Toggle Side
                    toggleSideBtn.onclick = () => {
                         if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({ type: 'toggle-position' }));
                        }
                    };
                    
                    reloadBtn.onclick = () => {
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({ type: 'reload' }));
                        }
                    };
                    
                    window.addEventListener('resize', updateSize);

                </script>
            </body>
            </html>`;
    }
}
