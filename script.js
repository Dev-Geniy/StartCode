// Core elements
const editors = {
    html: document.getElementById('html-editor'),
    css: document.getElementById('css-editor'),
    js: document.getElementById('js-editor'),
    php: document.getElementById('php-editor'),
    python: document.getElementById('python-editor'),
    sql: document.getElementById('sql-editor'),
    json: document.getElementById('json-editor'),
    markdown: document.getElementById('markdown-editor')
};

const previewFrame = document.getElementById('preview-frame');
const editorContainer = document.getElementById('editor-container');
const preview = document.getElementById('preview');
const resizer = document.getElementById('resizer');
const toggleEditors = document.getElementById('toggle-editors');
const toggleMode = document.getElementById('toggle-mode');
const tabs = document.getElementById('tabs');
const projectName = document.getElementById('project-name');
const saveBtn = document.getElementById('save-btn');
const projectsBtn = document.getElementById('projects-btn');
const newBtn = document.getElementById('new-btn');
const exportBtn = document.getElementById('export-btn');
const settingsBtn = document.getElementById('settings-btn');
const languageBtn = document.getElementById('language-btn');
const projectsModal = document.getElementById('projects-modal');
const closeProjects = document.getElementById('close-projects');
const projectsList = document.getElementById('projects-list');
const settingsModal = document.getElementById('settings-modal');
const closeSettings = document.getElementById('close-settings');
const markdownToolbar = document.getElementById('markdown-toolbar');
const toolbar = document.querySelector('.toolbar');

// State variables
let editorWindow = null;
let editorsVisible = true;
let tabMode = false;
let isDraggingEditor = false;
let resizing = false;
let offsetX, offsetY;
let currentLanguage = 'uk';
let settings = JSON.parse(localStorage.getItem('settings')) || {
    theme: 'dark',
    fontSize: 14,
    autosaveInterval: 5
};

// Language translations
const translations = {
    uk: {
        hideEditors: 'Приховати редактори',
        showEditors: 'Показати редактори',
        toggleMode: 'Переключити режим',
        horizontalMode: 'Горизонтальний режим',
        tabMode: 'Режим вкладок',
        projectName: 'Назва проєкту',
        save: 'Зберегти (Ctrl+S)',
        projects: 'Проєкти',
        newProject: 'Новий проєкт',
        export: 'Експорт',
        settings: 'Налаштування',
        language: 'Мова',
        projectsTitle: 'Проєкти',
        settingsTitle: 'Налаштування',
        saved: 'Збережено',
        confirmNew: 'Створити новий проєкт? Незбережені зміни будуть втрачені.'
    },
    en: {
        hideEditors: 'Hide Editors',
        showEditors: 'Show Editors',
        toggleMode: 'Toggle Mode',
        horizontalMode: 'Horizontal Mode',
        tabMode: 'Tab Mode',
        projectName: 'Project Name',
        save: 'Save (Ctrl+S)',
        projects: 'Projects',
        newProject: 'New Project',
        export: 'Export',
        settings: 'Settings',
        language: 'Language',
        projectsTitle: 'Projects',
        settingsTitle: 'Settings',
        saved: 'Saved',
        confirmNew: 'Create a new project? Unsaved changes will be lost.'
    }
};

// Utility functions
function debounce(fn, delay) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}

function resetEditors() {
    editors.html.value = '<h1>Hello, StatCode!</h1>';
    editors.css.value = 'h1 { color: #39FF14; text-align: center; }';
    editors.js.value = 'console.log("Hello from StatCode!");';
    editors.php.value = '<?php echo "Hello from PHP!"; ?>';
    editors.python.value = 'print("Hello from Python!")';
    editors.sql.value = 'SELECT * FROM users;';
    editors.json.value = '{\n  "name": "StatCode",\n  "version": "1.0"\n}';
    editors.markdown.value = '# Hello, Markdown!\nThis is a test.';
    projectName.value = '';
    updatePreview();
    if (editorWindow && !editorWindow.closed) syncEditorWindow();
}

resetEditors();

// Markdown parsing
function parseMarkdown(text) {
    return text
        .replace(/^# (.*)$/gm, '<h1>$1</h1>')
        .replace(/^## (.*)$/gm, '<h2>$1</h2>')
        .replace(/^### (.*)$/gm, '<h3>$1</h3>')
        .replace(/\*\*(.*)\*\*/g, '<b>$1</b>')
        .replace(/\*(.*)\*/g, '<i>$1</i>')
        .replace(/^- (.*)$/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
        .replace(/^> (.*)$/gm, '<blockquote>$1</blockquote>')
        .replace(/```(.*?)```/gs, '<pre><code>$1</code></pre>')
        .replace(/!\[([^\]]+)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
        .replace(/^\n/gm, '<br>');
}

// Update preview
function updatePreview() {
    try {
        const html = editors.html.value;
        const css = `<style>${editors.css.value}</style>`;
        const js = `<script>try { ${editors.js.value} } catch (e) { console.error(e); }</script>`;
        const markdown = parseMarkdown(editors.markdown.value);
        const content = `${html}${css}${js}<div>${markdown}</div>`;
        previewFrame.contentDocument.open();
        previewFrame.contentDocument.write(content);
        previewFrame.contentDocument.close();
    } catch (error) {
        console.error('Preview update failed:', error);
    }
}

// Event listeners for editors
Object.values(editors).forEach(editor => {
    editor.addEventListener('input', debounce(() => {
        updatePreview();
        if (editorWindow && !editorWindow.closed) syncEditorWindow();
    }, 300));
    editor.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = editor.selectionStart;
            const end = editor.selectionEnd;
            editor.value = editor.value.substring(0, start) + '  ' + editor.value.substring(end);
            editor.selectionStart = editor.selectionEnd = start + 2;
        }
    });
});

updatePreview();

// Resizer logic
resizer.addEventListener('mousedown', (e) => {
    if (!editorWindow || editorWindow.closed) {
        resizing = true;
        e.preventDefault();
    }
});
document.addEventListener('mousemove', (e) => {
    if (resizing && (!editorWindow || editorWindow.closed)) {
        const totalWidth = window.innerWidth;
        const newWidth = Math.max(200, Math.min(e.clientX, totalWidth - 200));
        editorContainer.style.width = `${(newWidth / totalWidth) * 100}%`;
        preview.style.width = `calc(100% - ${(newWidth / totalWidth) * 100}% - 6px)`;
    }
});
document.addEventListener('mouseup', () => resizing = false);

// Toggle editors visibility
toggleEditors.addEventListener('click', () => {
    editorsVisible = !editorsVisible;
    if (!editorsVisible && editorWindow && !editorWindow.closed) {
        editorWindow.close();
        editorWindow = null;
    }
    editorContainer.classList.toggle('hidden', !editorsVisible);
    toggleEditors.querySelector('i').classList.toggle('fa-code', editorsVisible);
    toggleEditors.querySelector('i').classList.toggle('fa-eye', !editorsVisible);
    toggleEditors.title = editorsVisible ? translations[currentLanguage].hideEditors : translations[currentLanguage].showEditors;
    preview.classList.toggle('fullscreen', !editorsVisible || (editorWindow && !editorWindow.closed));
    updateMarkdownToolbar();
    updateLanguage();
});

// Toggle tab mode
toggleMode.addEventListener('click', () => {
    if (editorWindow && !editorWindow.closed) return;
    tabMode = !tabMode;
    editorContainer.classList.toggle('tab-mode', tabMode);
    toggleMode.querySelector('i').classList.toggle('fa-columns', !tabMode);
    toggleMode.querySelector('i').classList.toggle('fa-th-list', tabMode);
    toggleMode.title = tabMode ? translations[currentLanguage].horizontalMode : translations[currentLanguage].tabMode;
    if (tabMode && !tabs.querySelector('.tab.active')) setActiveTab('html');
    adjustEditorHeight();
    updateMarkdownToolbar();
    if (editorWindow && !editorWindow.closed) syncEditorWindow();
});

// Dragging editor
toggleMode.addEventListener('mousedown', (e) => {
    if (editorWindow && !editorWindow.closed) return;
    isDraggingEditor = true;
    offsetX = e.clientX - editorContainer.offsetLeft;
    offsetY = e.clientY - editorContainer.offsetTop;
    editorContainer.classList.add('dragging');
    e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
    if (isDraggingEditor && (!editorWindow || editorWindow.closed)) {
        const newLeft = e.clientX - offsetX;
        const newTop = e.clientY - offsetY;
        editorContainer.style.left = `${newLeft}px`;
        editorContainer.style.top = `${newTop}px`;
        editorContainer.style.width = '50%';
        editorContainer.style.height = 'auto';

        if (Math.abs(newLeft) > 50 || Math.abs(newTop - 48) > 50) {
            openEditorInNewWindow();
            isDraggingEditor = false;
        }
    }
});

document.addEventListener('mouseup', () => {
    if (isDraggingEditor && (!editorWindow || editorWindow.closed)) {
        isDraggingEditor = false;
        editorContainer.classList.remove('dragging');
        const rect = editorContainer.getBoundingClientRect();
        if (!editorWindow && (rect.right < 0 || rect.left > window.innerWidth || rect.bottom < 0 || rect.top > window.innerHeight)) {
            editorContainer.style.left = '0px';
            editorContainer.style.top = '48px';
        }
        adjustEditorHeight();
    }
});

// Open editor in new window
// Open editor in new window with modern design matching the main window
function openEditorInNewWindow() {
    if (editorWindow && !editorWindow.closed) return;
    editorWindow = window.open('', '_blank', 'width=800,height=600');
    editorWindow.document.write(`
        <!DOCTYPE html>
        <html lang="${currentLanguage}">
        <head>
            <meta charset="UTF-8">
            <title>StatCode Editor</title>
            <link rel="stylesheet" href="styles.css">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
            <style>
                body { 
                    margin: 0; 
                    font-family: 'Segoe UI', Arial, sans-serif; 
                    background: #1e1e1e; 
                    color: #fff; 
                    overflow: hidden; 
                }
                .toolbar { 
                    background: #2a2a2a; 
                    padding: 8px; 
                    display: flex; 
                    align-items: center; 
                    gap: 12px; 
                    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3); 
                    position: relative; 
                    z-index: 100; 
                    border-bottom: 1px solid #333;
                }
                .tool-icon { 
                    cursor: pointer; 
                    color: #39FF14; 
                    font-size: 20px; 
                    padding: 6px; 
                    transition: color 0.2s ease, transform 0.2s ease; 
                }
                .tool-icon:hover { 
                    color: #00DDEB; 
                    transform: scale(1.1); 
                }
                .editor-container { 
                    width: 100%; 
                    background: #252525; 
                    display: flex; 
                    flex-direction: column; 
                    height: calc(100vh - 48px); 
                    transition: opacity 0.3s ease; 
                }
                .tabs { 
                    display: ${tabMode ? 'flex' : 'none'}; 
                    background: #2a2a2a; 
                    padding: 8px; 
                    gap: 8px; 
                    overflow-x: auto; 
                    white-space: nowrap; 
                    border-bottom: 1px solid #333; 
                }
                .tab { 
                    padding: 6px 12px; 
                    color: #39FF14; 
                    cursor: pointer; 
                    transition: background 0.2s ease, color 0.2s ease; 
                    border-radius: 4px; 
                }
                .tab:hover { 
                    background: #3a3a3a; 
                }
                .tab.active { 
                    background: #00DDEB; 
                    color: #fff; 
                }
                .editor-container.tab-mode .tabs { 
                    display: flex; 
                }
                .editor-container.tab-mode .editor-panel { 
                    display: none; 
                }
                .editor-container.tab-mode .editor-panel.active { 
                    display: flex; 
                    flex: 1; 
                }
                .editor-panel { 
                    flex: 1; 
                    padding: 8px; 
                    border-bottom: 1px solid #333; 
                    display: flex; 
                    background: #252525;
                }
                .editor-panel:last-child { 
                    border-bottom: none; 
                }
                .editor { 
                    width: 100%; 
                    height: 100%; 
                    border: 1px solid #333; 
                    resize: none; 
                    font-family: 'Fira Code', monospace; 
                    padding: 8px; 
                    box-sizing: border-box; 
                    overflow-y: auto; 
                    transition: background 0.3s ease, color 0.3s ease; 
                    background: #1e1e1e; 
                    color: #dcdcdc; 
                    box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.2); 
                }
                .editor:focus { 
                    outline: none; 
                    border-color: #39FF14; 
                    box-shadow: 0 0 5px rgba(57, 255, 20, 0.5); 
                }
                .editor-preview { 
                    display: none; 
                    height: 200px; 
                    background: #fff; 
                    padding: 8px; 
                    border-top: 1px solid #333; 
                }
                .editor-preview.active { 
                    display: block; 
                }
                .markdown-toolbar { 
                    display: none; 
                    position: absolute; 
                    top: 60px; 
                    left: 10px; 
                    background: #2a2a2a; 
                    padding: 8px; 
                    border-radius: 6px; 
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5); 
                    gap: 8px; 
                    cursor: move; 
                    z-index: 1000; 
                }
                .markdown-toolbar.active { 
                    display: flex; 
                }
                .markdown-toolbar .tool-icon { 
                    font-size: 16px; 
                }
            </style>
        </head>
        <body>
            <div class="toolbar">
                <span class="tool-icon" id="toggle-mode" title="${translations[currentLanguage].toggleMode}"><i class="fas ${tabMode ? 'fa-th-list' : 'fa-columns'}"></i></span>
                <span class="tool-icon" id="return-btn" title="${translations[currentLanguage].returnMain || 'Повернути в основне вікно'}"><i class="fas fa-window-restore"></i></span>
                <span class="tool-icon" id="preview-toggle" title="${translations[currentLanguage].previewMarkdown || 'Переглянути Markdown'}"><i class="fas fa-eye"></i></span>
            </div>
            <div class="editor-container ${tabMode ? 'tab-mode' : ''}" id="editor-container">
                <div class="tabs" id="tabs">
                    <span class="tab" data-type="html">HTML</span>
                    <span class="tab" data-type="css">CSS</span>
                    <span class="tab" data-type="js">JS</span>
                    <span class="tab" data-type="php">PHP</span>
                    <span class="tab" data-type="python">Python</span>
                    <span class="tab" data-type="sql">SQL</span>
                    <span class="tab" data-type="json">JSON</span>
                    <span class="tab" data-type="markdown">Markdown</span>
                </div>
                <div class="editor-panel" data-type="html">
                    <textarea id="html-editor" class="editor ${settings.theme}"></textarea>
                </div>
                <div class="editor-panel" data-type="css">
                    <textarea id="css-editor" class="editor ${settings.theme}"></textarea>
                </div>
                <div class="editor-panel" data-type="js">
                    <textarea id="js-editor" class="editor ${settings.theme}"></textarea>
                </div>
                <div class="editor-panel" data-type="php">
                    <textarea id="php-editor" class="editor ${settings.theme}"></textarea>
                </div>
                <div class="editor-panel" data-type="python">
                    <textarea id="python-editor" class="editor ${settings.theme}"></textarea>
                </div>
                <div class="editor-panel" data-type="sql">
                    <textarea id="sql-editor" class="editor ${settings.theme}"></textarea>
                </div>
                <div class="editor-panel" data-type="json">
                    <textarea id="json-editor" class="editor ${settings.theme}"></textarea>
                </div>
                <div class="editor-panel" data-type="markdown">
                    <textarea id="markdown-editor" class="editor ${settings.theme}"></textarea>
                </div>
            </div>
            <div class="editor-preview" id="editor-preview">
                <iframe id="preview-frame"></iframe>
            </div>
            <div class="markdown-toolbar" id="markdown-toolbar">
                <span class="tool-icon" title="Заголовок 1" data-action="h1"><i class="fas fa-heading"></i> H1</span>
                <span class="tool-icon" title="Заголовок 2" data-action="h2"><i class="fas fa-heading"></i> H2</span>
                <span class="tool-icon" title="Жирний" data-action="bold"><i class="fas fa-bold"></i></span>
                <span class="tool-icon" title="Курсив" data-action="italic"><i class="fas fa-italic"></i></span>
                <span class="tool-icon" title="Список" data-action="list"><i class="fas fa-list-ul"></i></span>
                <span class="tool-icon" title="Посилання" data-action="link"><i class="fas fa-link"></i></span>
                <span class="tool-icon" title="Код" data-action="code"><i class="fas fa-code"></i></span>
                <span class="tool-icon" title="Цитата" data-action="quote"><i class="fas fa-quote-left"></i></span>
                <span class="tool-icon" title="Зображення" data-action="image"><i class="fas fa-image"></i></span>
            </div>
            <script>
                const editors = {
                    html: document.getElementById('html-editor'),
                    css: document.getElementById('css-editor'),
                    js: document.getElementById('js-editor'),
                    php: document.getElementById('php-editor'),
                    python: document.getElementById('python-editor'),
                    sql: document.getElementById('sql-editor'),
                    json: document.getElementById('json-editor'),
                    markdown: document.getElementById('markdown-editor')
                };
                const previewFrame = document.getElementById('preview-frame');
                let tabMode = ${tabMode};
                const tabs = document.getElementById('tabs');
                const editorContainer = document.getElementById('editor-container');
                const markdownToolbar = document.getElementById('markdown-toolbar');
                const toggleMode = document.getElementById('toggle-mode');
                const returnBtn = document.getElementById('return-btn');
                const previewToggle = document.getElementById('preview-toggle');
                const editorPreview = document.getElementById('editor-preview');
                let previewVisible = false;

                function debounce(fn, delay) {
                    let timeout;
                    return function (...args) {
                        clearTimeout(timeout);
                        timeout = setTimeout(() => fn(...args), delay);
                    };
                }

                function parseMarkdown(text) {
                    return text
                        .replace(/^# (.*)$/gm, '<h1>$1</h1>')
                        .replace(/^## (.*)$/gm, '<h2>$1</h2>')
                        .replace(/^### (.*)$/gm, '<h3>$1</h3>')
                        .replace(/\\*\\*(.*)\\*\\*/g, '<b>$1</b>')
                        .replace(/\\*(.*)\\*/g, '<i>$1</i>')
                        .replace(/^- (.*)$/gm, '<li>$1</li>')
                        .replace(/(<li>.*<\\/li>)/g, '<ul>$1</ul>')
                        .replace(/\\[(.*?)\\]\\((.*?)\\)/g, '<a href="$2">$1</a>')
                        .replace(/^> (.*)$/gm, '<blockquote>$1</blockquote>')
                        .replace(/\`\`\`(.*?)\`\`\`/gs, '<pre><code>$1</code></pre>')
                        .replace(/!\\[(.*?)\\]\\((.*?)\\)/g, '<img src="$2" alt="$1">')
                        .replace(/^\\n/gm, '<br>');
                }

                function updatePreview() {
                    const html = editors.html.value;
                    const css = \`<style>\${editors.css.value}</style>\`;
                    const js = \`<script>try { \${editors.js.value} } catch (e) { console.error(e); }</script>\`;
                    const markdown = parseMarkdown(editors.markdown.value);
                    const content = \`\${html}\${css}\${js}<div>\${markdown}</div>\`;
                    previewFrame.contentDocument.open();
                    previewFrame.contentDocument.write(content);
                    previewFrame.contentDocument.close();
                }

                Object.values(editors).forEach(editor => {
                    editor.style.fontSize = '${settings.fontSize}px';
                    editor.addEventListener('input', debounce(() => {
                        window.opener.postMessage({
                            type: 'editorUpdate',
                            data: Object.fromEntries(Object.entries(editors).map(([key, el]) => [key, el.value]))
                        }, '*');
                        if (previewVisible && editors.markdown === editor) updatePreview();
                    }, 300));
                    editor.addEventListener('keydown', (e) => {
                        if (e.key === 'Tab') {
                            e.preventDefault();
                            const start = editor.selectionStart;
                            const end = editor.selectionEnd;
                            editor.value = editor.value.substring(0, start) + '  ' + editor.value.substring(end);
                            editor.selectionStart = editor.selectionEnd = start + 2;
                        }
                    });
                });

                tabs.querySelectorAll('.tab').forEach(tab => {
                    tab.addEventListener('click', () => {
                        if (tabMode) {
                            tabs.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                            document.querySelectorAll('.editor-panel').forEach(p => {
                                p.style.display = 'none';
                                p.classList.remove('active');
                            });
                            tab.classList.add('active');
                            const panel = document.querySelector(\`.editor-panel[data-type="\${tab.dataset.type}"]\`);
                            if (panel) {
                                panel.style.display = 'flex';
                                panel.classList.add('active');
                            }
                            window.opener.postMessage({ type: 'setActiveTab', tab: tab.dataset.type }, '*');
                            updateMarkdownToolbar();
                            if (previewVisible && tab.dataset.type === 'markdown') updatePreview();
                        }
                    });
                });

                toggleMode.addEventListener('click', () => {
                    tabMode = !tabMode;
                    editorContainer.classList.toggle('tab-mode', tabMode);
                    toggleMode.querySelector('i').classList.toggle('fa-columns', !tabMode);
                    toggleMode.querySelector('i').classList.toggle('fa-th-list', tabMode);
                    toggleMode.title = tabMode ? '${translations[currentLanguage].horizontalMode}' : '${translations[currentLanguage].tabMode}';
                    adjustEditorHeight();
                    window.opener.postMessage({ type: 'tabMode', value: tabMode }, '*');
                    updateMarkdownToolbar();
                });

                returnBtn.addEventListener('click', () => {
                    window.opener.postMessage({ type: 'returnEditor' }, '*');
                    window.close();
                });

                previewToggle.addEventListener('click', () => {
                    previewVisible = !previewVisible;
                    editorPreview.classList.toggle('active', previewVisible);
                    previewToggle.querySelector('i').classList.toggle('fa-eye', !previewVisible);
                    previewToggle.querySelector('i').classList.toggle('fa-eye-slash', previewVisible);
                    if (previewVisible && tabs.querySelector('.tab.active')?.dataset.type === 'markdown') updatePreview();
                    adjustEditorHeight();
                });

                function adjustEditorHeight() {
                    const heightOffset = previewVisible ? 248 : 48;
                    editorContainer.style.height = \`calc(100vh - \${heightOffset}px)\`;
                    if (!tabMode) {
                        document.querySelectorAll('.editor-panel').forEach(panel => {
                            panel.style.height = \`\${(100 / Object.keys(editors).length)}%\`;
                        });
                    } else {
                        const activePanel = document.querySelector('.editor-panel.active');
                        if (activePanel) activePanel.style.height = '100%';
                    }
                }

                function updateMarkdownToolbar() {
                    const isMarkdownActive = tabs.querySelector('.tab.active')?.dataset.type === 'markdown';
                    markdownToolbar.classList.toggle('active', isMarkdownActive && tabMode);
                }

                markdownToolbar.querySelectorAll('.tool-icon').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const action = btn.dataset.action;
                        const textarea = editors.markdown;
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const selectedText = textarea.value.substring(start, end) || 'Текст';
                        let newText;

                        switch (action) {
                            case 'h1': newText = \`# \${selectedText}\`; break;
                            case 'h2': newText = \`## \${selectedText}\`; break;
                            case 'bold': newText = \`**\${selectedText}**\`; break;
                            case 'italic': newText = \`*\${selectedText}*\`; break;
                            case 'list': newText = selectedText.split('\\n').map(line => \`- \${line}\`).join('\\n'); break;
                            case 'link': newText = \`[\${selectedText}](https://)\`; break;
                            case 'code': newText = \`\`\`\\n\${selectedText}\\n\`\`\`\`; break;
                            case 'quote': newText = \`> \${selectedText}\`; break;
                            case 'image': newText = \`![\${selectedText}](https://)\`; break;
                        }

                        textarea.value = textarea.value.substring(0, start) + newText + textarea.value.substring(end);
                        window.opener.postMessage({
                            type: 'editorUpdate',
                            data: Object.fromEntries(Object.entries(editors).map(([key, el]) => [key, el.value]))
                        }, '*');
                        if (previewVisible) updatePreview();
                        textarea.focus();
                    });
                });

                window.addEventListener('message', (e) => {
                    if (e.data.type === 'editorUpdate') {
                        Object.entries(e.data.data).forEach(([key, value]) => editors[key].value = value);
                        if (previewVisible && tabs.querySelector('.tab.active')?.dataset.type === 'markdown') updatePreview();
                    } else if (e.data.type === 'setActiveTab') {
                        tabs.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                        document.querySelectorAll('.editor-panel').forEach(p => {
                            p.style.display = 'none';
                            p.classList.remove('active');
                        });
                        const tab = tabs.querySelector(\`.tab[data-type="\${e.data.tab}"]\`);
                        const panel = document.querySelector(\`.editor-panel[data-type="\${e.data.tab}"]\`);
                        if (tab && panel) {
                            tab.classList.add('active');
                            panel.style.display = 'flex';
                            panel.classList.add('active');
                        }
                        updateMarkdownToolbar();
                        if (previewVisible && e.data.tab === 'markdown') updatePreview();
                    } else if (e.data.type === 'tabMode') {
                        tabMode = e.data.value;
                        editorContainer.classList.toggle('tab-mode', tabMode);
                        adjustEditorHeight();
                        updateMarkdownToolbar();
                    } else if (e.data.type === 'applySettings') {
                        Object.values(editors).forEach(editor => {
                            editor.classList.remove('dark', 'light', 'gradient', 'futuristic', 'hacker');
                            editor.classList.add(e.data.theme);
                            editor.style.fontSize = \`\${e.data.fontSize}px\`;
                        });
                        const toolbar = document.querySelector('.toolbar');
                        toolbar.classList.remove('futuristic', 'hacker');
                        if (e.data.theme === 'futuristic') toolbar.classList.add('futuristic');
                        if (e.data.theme === 'hacker') toolbar.classList.add('hacker');
                    }
                });

                window.addEventListener('beforeunload', () => {
                    window.opener.postMessage({ type: 'editorWindowClosed' }, '*');
                });

                adjustEditorHeight();
                updateMarkdownToolbar();
            </script>
        </body>
        </html>
    `);
    editorWindow.document.close();
    syncEditorWindow();
    editorContainer.classList.add('hidden');
    preview.classList.add('fullscreen');
    editorsVisible = false;
    toggleEditors.querySelector('i').classList.remove('fa-code');
    toggleEditors.querySelector('i').classList.add('fa-eye');
    toggleEditors.title = translations[currentLanguage].showEditors;
}

// Message handler
window.addEventListener('message', (e) => {
    if (e.data.type === 'editorUpdate') {
        Object.entries(e.data.data).forEach(([key, value]) => editors[key].value = value);
        updatePreview();
    } else if (e.data.type === 'setActiveTab') {
        setActiveTab(e.data.tab);
    } else if (e.data.type === 'tabMode') {
        tabMode = e.data.value;
        editorContainer.classList.toggle('tab-mode', tabMode);
        if (tabMode && !tabs.querySelector('.tab.active')) setActiveTab('html');
        adjustEditorHeight();
        updateMarkdownToolbar();
    } else if (e.data.type === 'returnEditor') {
        editorContainer.classList.remove('hidden');
        editorsVisible = true;
        toggleEditors.querySelector('i').classList.remove('fa-eye');
        toggleEditors.querySelector('i').classList.add('fa-code');
        toggleEditors.title = translations[currentLanguage].hideEditors;
        preview.classList.remove('fullscreen');
        editorWindow = null;
        adjustEditorHeight();
        updateMarkdownToolbar();
    } else if (e.data.type === 'editorWindowClosed') {
        editorWindow = null;
        editorContainer.classList.remove('hidden');
        editorsVisible = true;
        toggleEditors.querySelector('i').classList.remove('fa-eye');
        toggleEditors.querySelector('i').classList.add('fa-code');
        toggleEditors.title = translations[currentLanguage].hideEditors;
        preview.classList.remove('fullscreen');
        adjustEditorHeight();
        updateMarkdownToolbar();
    }
});

// Sync editor window
function syncEditorWindow() {
    if (editorWindow && !editorWindow.closed) {
        editorWindow.postMessage({
            type: 'editorUpdate',
            data: Object.fromEntries(Object.entries(editors).map(([key, el]) => [key, el.value]))
        }, '*');
        const activeTab = tabs.querySelector('.tab.active')?.dataset.type;
        if (activeTab) {
            editorWindow.postMessage({ type: 'setActiveTab', tab: activeTab }, '*');
        }
        editorWindow.postMessage({ type: 'tabMode', value: tabMode }, '*');
        editorWindow.postMessage({
            type: 'applySettings',
            theme: settings.theme,
            fontSize: settings.fontSize
        }, '*');
    }
}

// Tab management
tabs.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        if (tabMode && (!editorWindow || editorWindow.closed)) {
            setActiveTab(tab.dataset.type);
        }
    });
});

function setActiveTab(type) {
    tabs.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.editor-panel').forEach(p => {
        p.classList.remove('active');
        p.style.display = tabMode ? 'none' : 'flex';
    });
    const tab = tabs.querySelector(`.tab[data-type="${type}"]`);
    const panel = document.querySelector(`.editor-panel[data-type="${type}"]`);
    if (tab && panel) {
        tab.classList.add('active');
        panel.classList.add('active');
        if (tabMode) panel.style.display = 'flex';
    }
    adjustEditorHeight();
    if (editorWindow && !editorWindow.closed) {
        editorWindow.postMessage({ type: 'setActiveTab', tab: type }, '*');
    }
    updateMarkdownToolbar();
}

// Adjust editor height
function adjustEditorHeight() {
    if (!tabMode) {
        editorContainer.style.height = 'calc(100vh - 48px)';
        document.querySelectorAll('.editor-panel').forEach(panel => {
            panel.style.height = `${(100 / Object.keys(editors).length)}%`;
        });
    } else {
        editorContainer.style.height = 'calc(100vh - 48px)';
        const activePanel = document.querySelector('.editor-panel.active');
        if (activePanel) activePanel.style.height = '100%';
    }
}

// Project management
function saveProject() {
    const name = projectName.value.trim() || `Project_${Date.now()}`;
    const project = {
        name,
        html: editors.html.value,
        css: editors.css.value,
        js: editors.js.value,
        php: editors.php.value,
        python: editors.python.value,
        sql: editors.sql.value,
        json: editors.json.value,
        markdown: editors.markdown.value
    };
    let projects = JSON.parse(localStorage.getItem('projects') || '[]');
    projects = projects.filter(p => p.name !== name);
    projects.push(project);
    localStorage.setItem('projects', JSON.stringify(projects));
    return name;
}

saveBtn.addEventListener('click', () => {
    const name = saveProject();
    alert(`${translations[currentLanguage].saved}: ${name}`);
    loadProjects();
});

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        const name = saveProject();
        alert(`${translations[currentLanguage].saved}: ${name}`);
        loadProjects();
    }
});

newBtn.addEventListener('click', () => {
    if (confirm(translations[currentLanguage].confirmNew)) {
        resetEditors();
    }
});

exportBtn.addEventListener('click', () => {
    const activeTab = tabs.querySelector('.tab.active')?.dataset.type || 'html';
    const exportMap = {
        html: { content: `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${projectName.value || 'StatCode'}</title><style>${editors.css.value}</style></head><body>${editors.html.value}<script>${editors.js.value}</script></body></html>`, ext: '.html', type: 'text/html' },
        css: { content: editors.css.value, ext: '.css', type: 'text/css' },
        js: { content: editors.js.value, ext: '.js', type: 'text/javascript' },
        php: { content: editors.php.value, ext: '.php', type: 'application/x-httpd-php' },
        python: { content: editors.python.value, ext: '.py', type: 'text/x-python' },
        sql: { content: editors.sql.value, ext: '.sql', type: 'text/sql' },
        json: { content: editors.json.value, ext: '.json', type: 'application/json' },
        markdown: { content: editors.markdown.value, ext: '.md', type: 'text/markdown' }
    };
    const { content, ext, type } = exportMap[activeTab];
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.value || 'project'}${ext}`;
    a.click();
    URL.revokeObjectURL(url);
});

function loadProjects() {
    projectsList.innerHTML = '';
    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    projects.forEach(project => {
        const item = document.createElement('div');
        item.className = 'project-item';
        item.innerHTML = `${project.name} <span class="delete-btn"><i class="fas fa-trash"></i></span>`;
        item.addEventListener('click', () => {
            editors.html.value = project.html;
            editors.css.value = project.css;
            editors.js.value = project.js;
            editors.php.value = project.php;
            editors.python.value = project.python;
            editors.sql.value = project.sql;
            editors.json.value = project.json;
            editors.markdown.value = project.markdown;
            projectName.value = project.name;
            projectsModal.style.display = 'none';
            updatePreview();
            if (editorWindow && !editorWindow.closed) syncEditorWindow();
            updateMarkdownToolbar();
        });
        item.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`Видалити ${project.name}?`)) {
                let projects = JSON.parse(localStorage.getItem('projects') || '[]');
                projects = projects.filter(p => p.name !== project.name);
                localStorage.setItem('projects', JSON.stringify(projects));
                loadProjects();
            }
        });
        projectsList.appendChild(item);
    });
}

projectsBtn.addEventListener('click', () => {
    projectsModal.style.display = 'block';
    loadProjects();
});
closeProjects.addEventListener('click', () => projectsModal.style.display = 'none');

// Draggable modals
function makeDraggable(element) {
    let dragging = false;
    let offsetX, offsetY;
    element.addEventListener('mousedown', (e) => {
        dragging = true;
        offsetX = e.clientX - element.offsetLeft;
        offsetY = e.clientY - element.offsetTop;
        element.style.zIndex = '2000';
        e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
        if (dragging) {
            element.style.left = `${e.clientX - offsetX}px`;
            element.style.top = `${e.clientY - offsetY}px`;
        }
    });
    document.addEventListener('mouseup', () => {
        if (dragging) {
            dragging = false;
            element.style.zIndex = '1000';
        }
    });
}

makeDraggable(projectsModal);
makeDraggable(markdownToolbar);
makeDraggable(settingsModal);

// Markdown toolbar
function updateMarkdownToolbar() {
    const isMarkdownActive = tabs.querySelector('.tab.active')?.dataset.type === 'markdown' && editorsVisible;
    markdownToolbar.classList.toggle('active', isMarkdownActive && tabMode);
}

markdownToolbar.querySelectorAll('.tool-icon').forEach(btn => {
    btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const textarea = editors.markdown;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end) || 'Текст';
        let newText;

        switch (action) {
            case 'h1': newText = `# ${selectedText}`; break;
            case 'h2': newText = `## ${selectedText}`; break;
            case 'bold': newText = `**${selectedText}**`; break;
            case 'italic': newText = `*${selectedText}*`; break;
            case 'list': newText = selectedText.split('\n').map(line => `- ${line}`).join('\n'); break;
            case 'link': newText = `[${selectedText}](https://)`; break;
            case 'code': newText = `\`\`\`\n${selectedText}\n\`\`\``; break;
            case 'quote': newText = `> ${selectedText}`; break;
            case 'image': newText = `![${selectedText}](https://)`; break;
        }

        textarea.value = textarea.value.substring(0, start) + newText + textarea.value.substring(end);
        updatePreview();
        if (editorWindow && !editorWindow.closed) syncEditorWindow();
        textarea.focus();
    });
});

// Settings
settingsBtn.addEventListener('click', () => {
    settingsModal.style.display = 'block';
    document.getElementById('editor-theme').value = settings.theme;
    document.getElementById('font-size').value = settings.fontSize;
    document.getElementById('autosave-interval').value = settings.autosaveInterval;
});

closeSettings.addEventListener('click', () => settingsModal.style.display = 'none');

document.getElementById('save-settings').addEventListener('click', () => {
    applySettings();
    settingsModal.style.display = 'none';
});

function applySettings() {
    settings = {
        theme: document.getElementById('editor-theme').value,
        fontSize: parseInt(document.getElementById('font-size').value, 10) || 14,
        autosaveInterval: parseInt(document.getElementById('autosave-interval').value, 10) || 5
    };
    localStorage.setItem('settings', JSON.stringify(settings));

    Object.values(editors).forEach(editor => {
        editor.classList.remove('dark', 'light', 'gradient', 'futuristic', 'hacker');
        editor.classList.add(settings.theme);
        editor.style.fontSize = `${settings.fontSize}px`;
    });

    toolbar.classList.remove('futuristic', 'hacker');
    if (settings.theme === 'futuristic') toolbar.classList.add('futuristic');
    if (settings.theme === 'hacker') toolbar.classList.add('hacker');

    clearInterval(autosaveInterval);
    autosaveInterval = setInterval(() => {
        if (projectName.value.trim()) saveProject();
    }, settings.autosaveInterval * 1000);

    if (editorWindow && !editorWindow.closed) syncEditorWindow();
}

let autosaveInterval = setInterval(() => {
    if (projectName.value.trim()) saveProject();
}, settings.autosaveInterval * 1000);

// Language switch
languageBtn.addEventListener('click', () => {
    currentLanguage = currentLanguage === 'uk' ? 'en' : 'uk';
    updateLanguage();
    if (editorWindow && !editorWindow.closed) openEditorInNewWindow(); // Reopen to apply language
});

function updateLanguage() {
    toggleEditors.title = editorsVisible ? translations[currentLanguage].hideEditors : translations[currentLanguage].showEditors;
    toggleMode.title = tabMode ? translations[currentLanguage].horizontalMode : translations[currentLanguage].tabMode;
    projectName.placeholder = translations[currentLanguage].projectName;
    saveBtn.title = translations[currentLanguage].save;
    projectsBtn.title = translations[currentLanguage].projects;
    newBtn.title = translations[currentLanguage].newProject;
    exportBtn.title = translations[currentLanguage].export;
    settingsBtn.title = translations[currentLanguage].settings;
    languageBtn.title = translations[currentLanguage].language;
    projectsModal.querySelector('h3').textContent = translations[currentLanguage].projectsTitle;
    settingsModal.querySelector('h3').textContent = translations[currentLanguage].settingsTitle;
}

// Initial setup
applySettings();
adjustEditorHeight();
updateLanguage();
