import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
    let disposableComparison = vscode.commands.registerCommand('imageUtils.openComparison', async (resourceUri?: vscode.Uri, allSelected?: vscode.Uri[]) => {
        let dir1Path: string;
        let dir2Path: string;

        // Check if called from explorer context menu with selected folders
        if (resourceUri && allSelected && allSelected.length >= 2) {
            const selectedFolders = allSelected.filter(uri => uri.scheme === 'file');
            
            if (selectedFolders.length === 2) {
                dir1Path = selectedFolders[0].fsPath;
                dir2Path = selectedFolders[1].fsPath;
            } else if (selectedFolders.length > 2) {
                vscode.window.showErrorMessage('Please select exactly 2 folders (you selected ' + selectedFolders.length + ')');
                return;
            } else {
                vscode.window.showErrorMessage('Please select exactly 2 folders in the explorer');
                return;
            }
        } else {
            // Fallback to manual selection
            const dir1Uri = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                openLabel: 'Select First Directory'
            });

            if (!dir1Uri || dir1Uri.length === 0) {
                vscode.window.showErrorMessage('First directory not selected');
                return;
            }

            const dir2Uri = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                openLabel: 'Select Second Directory'
            });

            if (!dir2Uri || dir2Uri.length === 0) {
                vscode.window.showErrorMessage('Second directory not selected');
                return;
            }

            dir1Path = dir1Uri[0].fsPath;
            dir2Path = dir2Uri[0].fsPath;
        }

        const panel = vscode.window.createWebviewPanel(
            'imageCompare',
            'Image Compare',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        // Find matching images
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
        const dir1Images = getImageFiles(dir1Path, imageExtensions);
        const dir2Images = getImageFiles(dir2Path, imageExtensions);

        const matchingImages = findMatchingImages(dir1Images, dir2Images);

        if (matchingImages.length === 0) {
            vscode.window.showInformationMessage('No matching images found');
            return;
        }

        // Generate HTML content
        panel.webview.html = getWebviewContent(matchingImages, dir1Path, dir2Path, panel.webview, context.extensionUri);

        // Handle messages from webview
        panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'alert':
                        vscode.window.showErrorMessage(message.text);
                        return;
                }
            },
            undefined,
            context.subscriptions
        );
    });

    let disposableRename = vscode.commands.registerCommand('imageUtils.openRename', async (resourceUri?: vscode.Uri) => {
        let dirPath: string;

        if (resourceUri && resourceUri.scheme === 'file') {
            dirPath = resourceUri.fsPath;
        } else {
            const dirUri = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                openLabel: 'Select Directory to Rename Images'
            });

            if (!dirUri || dirUri.length === 0) {
                vscode.window.showErrorMessage('Directory not selected');
                return;
            }

            dirPath = dirUri[0].fsPath;
        }

        const panel = vscode.window.createWebviewPanel(
            'imageRename',
            'Rename Images',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
        const imageFiles = getImageFiles(dirPath, imageExtensions);

        if (imageFiles.length === 0) {
            vscode.window.showInformationMessage('No images found in directory');
            return;
        }

        panel.webview.html = getRenameWebviewContent(imageFiles, dirPath, panel.webview, context.extensionUri);

        panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'executeRename':
                        try {
                            // Show confirmation dialog
                            const confirmed = await vscode.window.showWarningMessage(
                                message.confirmMessage || `Are you sure you want to rename ${message.renameList.length} files?`,
                                'Yes', 'No'
                            );
                            
                            if (confirmed === 'Yes') {
                                const results = await executeRename(message.renameList, dirPath);
                                if (results.success) {
                                    vscode.window.showInformationMessage(`Successfully renamed ${results.count} files`);
                                    // Refresh the webview
                                    const updatedImageFiles = getImageFiles(dirPath, imageExtensions);
                                    panel.webview.html = getRenameWebviewContent(updatedImageFiles, dirPath, panel.webview, context.extensionUri);
                                } else {
                                    vscode.window.showErrorMessage(`Rename failed: ${results.error}`);
                                }
                            }
                        } catch (error) {
                            vscode.window.showErrorMessage(`Rename failed: ${error}`);
                        }
                        return;
                    case 'alert':
                        vscode.window.showErrorMessage(message.text);
                        return;
                }
            },
            undefined,
            context.subscriptions
        );
    });

    let disposablePreview = vscode.commands.registerCommand('imageUtils.openPreview', async (resourceUri?: vscode.Uri) => {
        let dirPath: string;

        if (resourceUri && resourceUri.scheme === 'file') {
            dirPath = resourceUri.fsPath;
        } else {
            const dirUri = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                openLabel: 'Select Directory to Preview'
            });

            if (!dirUri || dirUri.length === 0) {
                vscode.window.showErrorMessage('Directory not selected');
                return;
            }

            dirPath = dirUri[0].fsPath;
        }

        const panel = vscode.window.createWebviewPanel(
            'imagePreview',
            'Image Preview',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
        const imageFiles = getImageFiles(dirPath, imageExtensions);

        if (imageFiles.length === 0) {
            vscode.window.showInformationMessage('No images found in directory');
            return;
        }

        panel.webview.html = getPreviewWebviewContent(imageFiles, dirPath, panel.webview, context.extensionUri);

        panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'alert':
                        vscode.window.showErrorMessage(message.text);
                        return;
                }
            },
            undefined,
            context.subscriptions
        );
    });

    context.subscriptions.push(disposableComparison, disposableRename, disposablePreview);
}

function getImageFiles(dirPath: string, extensions: string[]): string[] {
    try {
        const files = fs.readdirSync(dirPath);
        return files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return extensions.includes(ext);
        });
    } catch (error) {
        return [];
    }
}

function findMatchingImages(dir1Images: string[], dir2Images: string[]): Array<{name: string, path1: string, path2: string}> {
    const matches: Array<{name: string, path1: string, path2: string}> = [];
    
    for (const img1 of dir1Images) {
        const baseName1 = path.parse(img1).name;
        for (const img2 of dir2Images) {
            const baseName2 = path.parse(img2).name;
            if (baseName1 === baseName2) {
                matches.push({
                    name: baseName1,
                    path1: img1,
                    path2: img2
                });
                break;
            }
        }
    }
    
    return matches;
}

function getWebviewContent(matchingImages: Array<{name: string, path1: string, path2: string}>, dir1Path: string, dir2Path: string, webview: vscode.Webview, extensionUri: vscode.Uri): string {
    const imageData = matchingImages.map((match, index) => {
        const img1Path = path.join(dir1Path, match.path1);
        const img2Path = path.join(dir2Path, match.path2);
        
        const img1Uri = webview.asWebviewUri(vscode.Uri.file(img1Path));
        const img2Uri = webview.asWebviewUri(vscode.Uri.file(img2Path));
        
        return {
            index,
            name: match.name,
            img1: img1Uri.toString(),
            img2: img2Uri.toString()
        };
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Image Compare</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #1e1e1e;
            color: #cccccc;
            font-size: 14px;
            line-height: 1.4;
        }
        .container {
            max-width: 100%;
            margin: 0 auto;
        }
        .image-pair {
            display: none;
            margin-bottom: 20px;
        }
        .image-pair.active {
            display: block;
        }
        .image-container {
            display: flex;
            gap: 20px;
            align-items: flex-start;
            height: 75vh;
        }
        .image-wrapper {
            flex: 1;
            text-align: center;
        }
        .image-wrapper h3 {
            margin-bottom: 10px;
            color: #ffffff;
        }
        .directory-path {
            font-size: 11px;
            color: #888;
            margin-bottom: 5px;
            word-wrap: break-word;
            font-family: monospace;
        }
        .image-wrapper img {
            width: 100%;
            height: 70vh;
            object-fit: contain;
            border: 2px solid #444;
            border-radius: 4px;
            background-color: #2d2d2d;
        }
        .navigation {
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            align-items: center;
            background-color: rgba(30, 30, 30, 0.9);
            padding: 15px 20px;
            border-radius: 8px;
            min-width: 600px;
            justify-content: space-between;
        }
        .nav-left {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-right: 30px;
        }
        .nav-center {
            display: flex;
            align-items: center;
            gap: 20px;
            flex: 1;
            justify-content: center;
        }
        .slider-container {
            flex: 1;
            max-width: 300px;
        }
        .slider {
            width: 100%;
            height: 6px;
            border-radius: 3px;
            background: #444;
            outline: none;
            -webkit-appearance: none;
        }
        .slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #0e639c;
            cursor: pointer;
        }
        .slider::-moz-range-thumb {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #0e639c;
            cursor: pointer;
            border: none;
        }
        .play-button {
            background-color: #0e639c;
            color: white;
            border: none;
            padding: 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .play-button:hover {
            background-color: #1177bb;
        }
        .play-button.paused {
            background-color: #dc3545;
        }
        .play-button.paused:hover {
            background-color: #c82333;
        }
        .speed-selector {
            background-color: #2d2d2d;
            color: white;
            border: 1px solid #444;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
        }
        .repeat-toggle {
            background-color: #2d2d2d;
            color: white;
            border: 1px solid #444;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
        }
        .repeat-toggle.active {
            background-color: #28a745;
            border-color: #28a745;
        }
        .nav-button {
            background-color: #28a745;
            color: white;
            border: none;
            padding: 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .nav-button:hover {
            background-color: #34ce57;
        }
        .nav-button:disabled {
            background-color: #555;
            cursor: not-allowed;
        }
        .counter {
            color: #ffffff;
            font-size: 16px;
        }
        .help-text {
            text-align: center;
            margin-top: 10px;
            color: #888;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Image Compare</h1>
        <div class="navigation">
            <div class="nav-left">
                <button class="nav-button" id="prevButton">←</button>
                <button class="nav-button" id="nextButton">→</button>
            </div>
            <div class="nav-center">
                <span class="counter" id="counter">1 / ${imageData.length}</span>
                <div class="slider-container">
                    <input type="range" min="1" max="${imageData.length}" value="1" class="slider" id="imageSlider">
                </div>
                <button class="play-button" id="playButton">▶</button>
                <select class="speed-selector" id="speedSelector">
                    <option value="100">0.1s</option>
                    <option value="500">0.5s</option>
                    <option value="1000">1s</option>
                    <option value="2000" selected>2s</option>
                </select>
                <button class="repeat-toggle" id="repeatToggle">Repeat: OFF</button>
            </div>
        </div>
        <div class="help-text">Use arrow keys, slider, or spacebar to navigate and control playback</div>
        
        ${imageData.map((img, index) => `
            <div class="image-pair ${index === 0 ? 'active' : ''}" data-index="${index}">
                <h2 style="text-align: center; color: #ffffff;">Image: ${img.name}</h2>
                <div class="image-container">
                    <div class="image-wrapper">
                        <div class="directory-path">${dir1Path}</div>
                        <img src="${img.img1}" alt="${img.name} from directory 1" />
                    </div>
                    <div class="image-wrapper">
                        <div class="directory-path">${dir2Path}</div>
                        <img src="${img.img2}" alt="${img.name} from directory 2" />
                    </div>
                </div>
            </div>
        `).join('')}
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let currentIndex = 0;
        const totalImages = ${imageData.length};
        let isPlaying = false;
        let playInterval = null;
        let isRepeatMode = false;
        
        const imagePairs = document.querySelectorAll('.image-pair');
        const slider = document.getElementById('imageSlider');
        const counter = document.getElementById('counter');
        const playButton = document.getElementById('playButton');
        const speedSelector = document.getElementById('speedSelector');
        const repeatToggle = document.getElementById('repeatToggle');
        const prevButton = document.getElementById('prevButton');
        const nextButton = document.getElementById('nextButton');
        
        function showImage(index) {
            imagePairs.forEach((pair, i) => {
                pair.classList.toggle('active', i === index);
            });
            
            counter.textContent = \`\${index + 1} / \${totalImages}\`;
            slider.value = index + 1;
        }
        
        function toggleRepeatMode() {
            isRepeatMode = !isRepeatMode;
            repeatToggle.textContent = isRepeatMode ? 'Repeat: ON' : 'Repeat: OFF';
            repeatToggle.classList.toggle('active', isRepeatMode);
        }
        
        function nextImage() {
            if (isPlaying) stopSlideshow();
            if (currentIndex < totalImages - 1) {
                currentIndex++;
                showImage(currentIndex);
            }
        }
        
        function prevImage() {
            if (isPlaying) stopSlideshow();
            if (currentIndex > 0) {
                currentIndex--;
                showImage(currentIndex);
            }
        }
        
        slider.addEventListener('input', (e) => {
            if (isPlaying) stopSlideshow();
            currentIndex = parseInt(e.target.value) - 1;
            showImage(currentIndex);
        });
        
        playButton.addEventListener('click', toggleSlideshow);
        repeatToggle.addEventListener('click', toggleRepeatMode);
        prevButton.addEventListener('click', prevImage);
        nextButton.addEventListener('click', nextImage);
        
        function startSlideshow() {
            // If at the last image and not in repeat mode, go back to first
            if (currentIndex === totalImages - 1 && !isRepeatMode) {
                currentIndex = 0;
                showImage(currentIndex);
            }
            
            isPlaying = true;
            playButton.textContent = '⏸';
            playButton.classList.add('paused');
            const interval = parseInt(speedSelector.value);
            playInterval = setInterval(() => {
                if (currentIndex < totalImages - 1) {
                    currentIndex++;
                    showImage(currentIndex);
                } else if (isRepeatMode) {
                    currentIndex = 0;
                    showImage(currentIndex);
                } else {
                    stopSlideshow();
                }
            }, interval);
        }
        
        function stopSlideshow() {
            isPlaying = false;
            playButton.textContent = '▶';
            playButton.classList.remove('paused');
            if (playInterval) {
                clearInterval(playInterval);
                playInterval = null;
            }
        }
        
        function toggleSlideshow() {
            if (isPlaying) {
                stopSlideshow();
            } else {
                startSlideshow();
            }
        }
        
        document.addEventListener('keydown', (event) => {
            switch(event.key) {
                case 'ArrowLeft':
                    event.preventDefault();
                    if (isPlaying) stopSlideshow();
                    prevImage();
                    break;
                case 'ArrowRight':
                    event.preventDefault();
                    if (isPlaying) stopSlideshow();
                    nextImage();
                    break;
                case ' ':
                case 'Space':
                    event.preventDefault();
                    toggleSlideshow();
                    break;
            }
        });
        
        // Initialize
        showImage(0);
    </script>
</body>
</html>`;
}

function getPreviewWebviewContent(imageFiles: string[], dirPath: string, webview: vscode.Webview, extensionUri: vscode.Uri): string {
    const imageData = imageFiles.map((filename, index) => {
        const imgPath = path.join(dirPath, filename);
        const imgUri = webview.asWebviewUri(vscode.Uri.file(imgPath));
        
        return {
            index,
            filename,
            uri: imgUri.toString()
        };
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Image Preview</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #1e1e1e;
            color: #cccccc;
        }
        .container {
            max-width: 100%;
            margin: 0 auto;
        }
        .directory-path {
            font-size: 12px;
            color: #888;
            margin-bottom: 20px;
            word-wrap: break-word;
            font-family: monospace;
        }
        .view-toggle {
            text-align: center;
            margin: 20px 0;
        }
        .toggle-button {
            background-color: #0e639c;
            color: white;
            border: none;
            padding: 8px 16px;
            margin: 0 5px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        .toggle-button:hover {
            background-color: #1177bb;
        }
        .toggle-button.active {
            background-color: #1177bb;
        }
        
        /* Grid View */
        .grid-view {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }
        .grid-item {
            background-color: #2d2d2d;
            border-radius: 8px;
            overflow: hidden;
            cursor: pointer;
            transition: transform 0.2s;
        }
        .grid-item:hover {
            transform: scale(1.02);
        }
        .grid-item img {
            width: 100%;
            height: 150px;
            object-fit: cover;
            display: block;
        }
        .grid-item .filename {
            padding: 8px;
            font-size: 12px;
            color: #ccc;
            text-align: center;
            word-wrap: break-word;
        }
        
        /* List View */
        .list-view {
            display: none;
            margin-top: 20px;
        }
        .list-item {
            display: flex;
            align-items: center;
            background-color: #2d2d2d;
            border-radius: 8px;
            margin-bottom: 10px;
            padding: 10px;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        .list-item:hover {
            background-color: #3a3a3a;
        }
        .list-item img {
            width: 80px;
            height: 80px;
            object-fit: cover;
            border-radius: 4px;
            margin-right: 15px;
        }
        .list-item-info {
            flex: 1;
        }
        .list-item-filename {
            font-size: 14px;
            color: #fff;
            margin-bottom: 5px;
        }
        .list-item-details {
            font-size: 12px;
            color: #888;
        }
        
        /* Fullscreen View */
        .fullscreen-view {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: #1e1e1e;
            z-index: 1000;
        }
        .fullscreen-header {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            background-color: rgba(30, 30, 30, 0.9);
            padding: 10px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            z-index: 1001;
        }
        .close-button {
            background-color: #666;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
        }
        .close-button:hover {
            background-color: #888;
        }
        .fullscreen-content {
            position: absolute;
            top: 60px;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        .fullscreen-image {
            max-width: 90%;
            max-height: 80%;
            object-fit: contain;
            cursor: grab;
            transition: transform 0.1s ease;
        }
        .fullscreen-image:active {
            cursor: grabbing;
        }
        .fullscreen-filename {
            margin-top: 20px;
            font-size: 16px;
            color: #fff;
        }
        .navigation {
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            align-items: center;
            background-color: rgba(30, 30, 30, 0.9);
            padding: 15px 20px;
            border-radius: 8px;
            min-width: 600px;
            justify-content: space-between;
        }
        .nav-left {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-right: 30px;
        }
        .nav-center {
            display: flex;
            align-items: center;
            gap: 20px;
            flex: 1;
            justify-content: center;
        }
        .slider-container {
            flex: 1;
            max-width: 300px;
        }
        .slider {
            width: 100%;
            height: 6px;
            border-radius: 3px;
            background: #444;
            outline: none;
            -webkit-appearance: none;
        }
        .slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #0e639c;
            cursor: pointer;
        }
        .slider::-moz-range-thumb {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #0e639c;
            cursor: pointer;
            border: none;
        }
        .play-button {
            background-color: #0e639c;
            color: white;
            border: none;
            padding: 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .play-button:hover {
            background-color: #1177bb;
        }
        .play-button.paused {
            background-color: #dc3545;
        }
        .play-button.paused:hover {
            background-color: #c82333;
        }
        .speed-selector {
            background-color: #2d2d2d;
            color: white;
            border: 1px solid #444;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
        }
        .nav-button {
            background-color: #28a745;
            color: white;
            border: none;
            padding: 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .nav-button:hover {
            background-color: #34ce57;
        }
        .nav-button:disabled {
            background-color: #555;
            cursor: not-allowed;
        }
        .repeat-toggle {
            background-color: #2d2d2d;
            color: white;
            border: 1px solid #444;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
        }
        .repeat-toggle.active {
            background-color: #28a745;
            border-color: #28a745;
        }
        .counter {
            color: #ffffff;
            font-size: 16px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Image Preview</h1>
        <div class="directory-path">Path: ${dirPath}</div>
        <div class="directory-path">Count: ${imageData.length} images</div>
        
        <div class="view-toggle">
            <button class="toggle-button active" id="gridToggle">Grid View</button>
            <button class="toggle-button" id="listToggle">List View</button>
        </div>
        
        <div class="grid-view" id="gridView">
            ${imageData.map(img => `
                <div class="grid-item" data-index="${img.index}">
                    <img src="${img.uri}" alt="${img.filename}" loading="lazy">
                    <div class="filename">${img.filename}</div>
                </div>
            `).join('')}
        </div>
        
        <div class="list-view" id="listView">
            ${imageData.map(img => `
                <div class="list-item" data-index="${img.index}">
                    <img src="${img.uri}" alt="${img.filename}" loading="lazy">
                    <div class="list-item-info">
                        <div class="list-item-filename">${img.filename}</div>
                        <div class="list-item-details">Size: Loading... | Resolution: Loading...</div>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
    
    <div class="fullscreen-view" id="fullscreenView">
        <div class="fullscreen-header">
            <div class="counter" id="fullscreenCounter">1 / ${imageData.length}</div>
            <button class="close-button" id="closeButton">Close</button>
        </div>
        <div class="fullscreen-content">
            <img class="fullscreen-image" id="fullscreenImage" src="" alt="">
            <div class="fullscreen-filename" id="fullscreenFilename"></div>
        </div>
        <div class="navigation">
            <div class="nav-left">
                <button class="nav-button" id="prevButton">←</button>
                <button class="nav-button" id="nextButton">→</button>
            </div>
            <div class="nav-center">
                <span class="counter" id="navigationCounter">1 / ${imageData.length}</span>
                <div class="slider-container">
                    <input type="range" min="1" max="${imageData.length}" value="1" class="slider" id="imageSlider">
                </div>
                <button class="play-button" id="playButton">▶</button>
                <select class="speed-selector" id="speedSelector">
                    <option value="100">0.1s</option>
                    <option value="500">0.5s</option>
                    <option value="1000">1s</option>
                    <option value="2000" selected>2s</option>
                </select>
                <button class="repeat-toggle" id="repeatToggle">Repeat: OFF</button>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const imageData = ${JSON.stringify(imageData)};
        let currentIndex = 0;
        let currentView = 'grid';
        let scale = 1;
        let translateX = 0;
        let translateY = 0;
        let isDragging = false;
        let lastMouseX = 0;
        let lastMouseY = 0;
        let isPlaying = false;
        let playInterval = null;
        let isRepeatMode = false;
        
        const gridView = document.getElementById('gridView');
        const listView = document.getElementById('listView');
        const fullscreenView = document.getElementById('fullscreenView');
        const fullscreenImage = document.getElementById('fullscreenImage');
        const fullscreenFilename = document.getElementById('fullscreenFilename');
        const fullscreenCounter = document.getElementById('fullscreenCounter');
        const navigationCounter = document.getElementById('navigationCounter');
        const imageSlider = document.getElementById('imageSlider');
        const playButton = document.getElementById('playButton');
        const speedSelector = document.getElementById('speedSelector');
        const repeatToggle = document.getElementById('repeatToggle');
        const closeButton = document.getElementById('closeButton');
        const prevButton = document.getElementById('prevButton');
        const nextButton = document.getElementById('nextButton');
        const gridToggle = document.getElementById('gridToggle');
        const listToggle = document.getElementById('listToggle');
        
        // View toggle handlers
        function switchToGrid() {
            currentView = 'grid';
            gridView.style.display = 'grid';
            listView.style.display = 'none';
            gridToggle.classList.add('active');
            listToggle.classList.remove('active');
        }
        
        function switchToList() {
            currentView = 'list';
            gridView.style.display = 'none';
            listView.style.display = 'block';
            gridToggle.classList.remove('active');
            listToggle.classList.add('active');
        }
        
        gridToggle.addEventListener('click', switchToGrid);
        listToggle.addEventListener('click', switchToList);
        
        // Grid item click handlers
        document.querySelectorAll('.grid-item, .list-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                openFullscreen(index);
            });
        });
        
        // Load image metadata for list view
        function loadImageMetadata() {
            document.querySelectorAll('.list-item').forEach(item => {
                const img = item.querySelector('img');
                const details = item.querySelector('.list-item-details');
                
                img.onload = function() {
                    details.textContent = \`Resolution: \${this.naturalWidth}x\${this.naturalHeight}\`;
                };
            });
        }
        
        // Call metadata loading after DOM is ready
        setTimeout(loadImageMetadata, 100);
        
        function openFullscreen(index) {
            currentIndex = index;
            scale = 1;
            translateX = 0;
            translateY = 0;
            updateFullscreenImage();
            fullscreenView.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
        
        function closeFullscreen() {
            if (isPlaying) stopSlideshow();
            fullscreenView.style.display = 'none';
            document.body.style.overflow = 'auto';
            scale = 1;
            translateX = 0;
            translateY = 0;
        }
        
        function updateFullscreenImage() {
            const img = imageData[currentIndex];
            fullscreenImage.src = img.uri;
            fullscreenFilename.textContent = img.filename;
            fullscreenCounter.textContent = \`\${currentIndex + 1} / \${imageData.length}\`;
            navigationCounter.textContent = \`\${currentIndex + 1} / \${imageData.length}\`;
            imageSlider.value = currentIndex + 1;
            
            prevButton.disabled = currentIndex === 0;
            nextButton.disabled = currentIndex === imageData.length - 1;
            
            // Reset transform when changing images
            scale = 1;
            translateX = 0;
            translateY = 0;
            updateImageTransform();
        }
        
        function updateImageTransform() {
            fullscreenImage.style.transform = \`translate(\${translateX}px, \${translateY}px) scale(\${scale})\`;
        }
        
        // Mouse drag zoom functionality
        fullscreenImage.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isDragging = true;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - lastMouseX;
            const deltaY = e.clientY - lastMouseY;
            
            if (Math.abs(deltaY) > Math.abs(deltaX)) {
                // Vertical movement - zoom
                const zoomFactor = deltaY > 0 ? 0.99 : 1.01;
                scale *= zoomFactor;
                scale = Math.max(0.1, Math.min(5, scale)); // Limit zoom range
            } else {
                // Horizontal movement - pan
                if (scale > 1) {
                    translateX += deltaX;
                    translateY += deltaY;
                }
            }
            
            updateImageTransform();
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
        
        // Mouse wheel zoom
        fullscreenImage.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            scale *= zoomFactor;
            scale = Math.max(0.1, Math.min(5, scale));
            updateImageTransform();
        });
        
        function startSlideshow() {
            // If at the last image and not in repeat mode, go back to first
            if (currentIndex === imageData.length - 1 && !isRepeatMode) {
                currentIndex = 0;
                updateFullscreenImage();
            }
            
            isPlaying = true;
            playButton.textContent = '⏸';
            playButton.classList.add('paused');
            const interval = parseInt(speedSelector.value);
            playInterval = setInterval(() => {
                if (currentIndex < imageData.length - 1) {
                    currentIndex++;
                    updateFullscreenImage();
                } else if (isRepeatMode) {
                    currentIndex = 0;
                    updateFullscreenImage();
                } else {
                    stopSlideshow();
                }
            }, interval);
        }
        
        function stopSlideshow() {
            isPlaying = false;
            playButton.textContent = '▶';
            playButton.classList.remove('paused');
            if (playInterval) {
                clearInterval(playInterval);
                playInterval = null;
            }
        }
        
        function toggleSlideshow() {
            if (isPlaying) {
                stopSlideshow();
            } else {
                startSlideshow();
            }
        }
        
        function toggleRepeatMode() {
            isRepeatMode = !isRepeatMode;
            repeatToggle.textContent = isRepeatMode ? 'Repeat: ON' : 'Repeat: OFF';
            repeatToggle.classList.toggle('active', isRepeatMode);
        }
        
        function nextImage() {
            if (isPlaying) stopSlideshow();
            if (currentIndex < imageData.length - 1) {
                currentIndex++;
                updateFullscreenImage();
            }
        }
        
        function prevImage() {
            if (isPlaying) stopSlideshow();
            if (currentIndex > 0) {
                currentIndex--;
                updateFullscreenImage();
            }
        }
        
        // Event listeners
        closeButton.addEventListener('click', closeFullscreen);
        prevButton.addEventListener('click', prevImage);
        nextButton.addEventListener('click', nextImage);
        playButton.addEventListener('click', toggleSlideshow);
        repeatToggle.addEventListener('click', toggleRepeatMode);
        
        // Slider event listener
        imageSlider.addEventListener('input', (e) => {
            if (isPlaying) stopSlideshow();
            currentIndex = parseInt(e.target.value) - 1;
            updateFullscreenImage();
        });
        
        // Keyboard navigation
        document.addEventListener('keydown', (event) => {
            if (fullscreenView.style.display === 'block') {
                switch(event.key) {
                    case 'Escape':
                        event.preventDefault();
                        if (isPlaying) stopSlideshow();
                        closeFullscreen();
                        break;
                    case 'ArrowLeft':
                        event.preventDefault();
                        prevImage();
                        break;
                    case 'ArrowRight':
                        event.preventDefault();
                        nextImage();
                        break;
                    case ' ':
                    case 'Space':
                        event.preventDefault();
                        toggleSlideshow();
                        break;
                }
            }
        });
        
        // Click outside to close
        fullscreenView.addEventListener('click', (event) => {
            if (event.target === fullscreenView) {
                closeFullscreen();
            }
        });
    </script>
</body>
</html>`;
}

async function executeRename(renameList: Array<{oldName: string, newName: string}>, dirPath: string): Promise<{success: boolean, count: number, error?: string}> {
    try {
        console.log('Starting rename operation:', { dirPath, itemCount: renameList.length });
        let count = 0;
        const errors = [];
        
        for (const item of renameList) {
            const oldPath = path.join(dirPath, item.oldName);
            const newPath = path.join(dirPath, item.newName);
            
            console.log(`Renaming: ${oldPath} -> ${newPath}`);
            
            if (!fs.existsSync(oldPath)) {
                errors.push(`Source file not found: ${item.oldName}`);
                continue;
            }
            
            if (fs.existsSync(newPath)) {
                errors.push(`Target file already exists: ${item.newName}`);
                continue;
            }
            
            try {
                fs.renameSync(oldPath, newPath);
                count++;
                console.log(`Successfully renamed: ${item.oldName} -> ${item.newName}`);
            } catch (renameError) {
                errors.push(`Failed to rename ${item.oldName}: ${renameError}`);
            }
        }
        
        console.log(`Rename operation completed: ${count} files renamed, ${errors.length} errors`);
        
        if (errors.length > 0) {
            console.log('Errors:', errors);
            return { success: false, count, error: errors.join('; ') };
        }
        
        return { success: true, count };
    } catch (error) {
        console.error('Rename operation failed:', error);
        return { success: false, count: 0, error: String(error) };
    }
}

function getRenameWebviewContent(imageFiles: string[], dirPath: string, webview: vscode.Webview, extensionUri: vscode.Uri): string {
    const imageData = imageFiles.map((filename, index) => {
        const imgPath = path.join(dirPath, filename);
        const imgUri = webview.asWebviewUri(vscode.Uri.file(imgPath));
        const ext = path.extname(filename);
        
        return {
            index,
            filename,
            extension: ext,
            uri: imgUri.toString()
        };
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rename Images</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #1e1e1e;
            color: #cccccc;
        }
        .container {
            max-width: 100%;
            margin: 0 auto;
        }
        .header {
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid #444;
        }
        .directory-path {
            font-size: 12px;
            color: #888;
            margin-bottom: 10px;
            word-wrap: break-word;
            font-family: monospace;
        }
        .controls {
            display: flex;
            gap: 20px;
            align-items: center;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        .control-group {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .control-group label {
            font-size: 14px;
            color: #ccc;
        }
        .control-input {
            background-color: #2d2d2d;
            color: white;
            border: 1px solid #444;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
        }
        .execute-button {
            background-color: #0e639c;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
        }
        .execute-button:hover {
            background-color: #1177bb;
        }
        .file-list {
            margin-top: 20px;
        }
        .file-item {
            display: flex;
            align-items: center;
            background-color: #2d2d2d;
            border-radius: 8px;
            margin-bottom: 10px;
            padding: 10px;
        }
        .file-item img {
            width: 60px;
            height: 60px;
            object-fit: cover;
            border-radius: 4px;
            margin-right: 15px;
        }
        .file-info {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 20px;
        }
        .original-name {
            font-size: 14px;
            color: #fff;
            min-width: 200px;
        }
        .arrow {
            font-size: 16px;
            color: #888;
        }
        .new-name {
            font-size: 14px;
            color: #4CAF50;
            min-width: 200px;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Rename Images</h1>
            <div class="directory-path">Path: ${dirPath}</div>
            <div class="directory-path">Count: ${imageData.length} images</div>
        </div>
        
        <div class="controls">
            <div class="control-group">
                <label>Prefix:</label>
                <input type="text" id="prefix" class="control-input" placeholder="e.g. IMG_" maxlength="20">
            </div>
            <div class="control-group">
                <label>Postfix:</label>
                <input type="text" id="postfix" class="control-input" placeholder="e.g. _edited" maxlength="20">
            </div>
            <div class="control-group">
                <label>Zero Padding:</label>
                <input type="number" id="zeroPadding" class="control-input" value="5" min="1" max="10">
            </div>
            <div class="control-group">
                <label>Sort Order:</label>
                <select id="sortOrder" class="control-input">
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                </select>
            </div>
            <div class="control-group">
                <label>Starting Number:</label>
                <input type="number" id="startNumber" class="control-input" value="1" min="0">
            </div>
            <button class="execute-button" id="executeButton">Execute Rename</button>
        </div>
        
        <div class="file-list" id="fileList">
            ${imageData.map(img => `
                <div class="file-item">
                    <img src="${img.uri}" alt="${img.filename}" loading="lazy">
                    <div class="file-info">
                        <div class="original-name">${img.filename}</div>
                        <div class="arrow">→</div>
                        <div class="new-name" data-index="${img.index}"></div>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const imageData = ${JSON.stringify(imageData)};
        
        const prefixInput = document.getElementById('prefix');
        const postfixInput = document.getElementById('postfix');
        const zeroPaddingInput = document.getElementById('zeroPadding');
        const sortOrderSelect = document.getElementById('sortOrder');
        const startNumberInput = document.getElementById('startNumber');
        const executeButton = document.getElementById('executeButton');
        
        function generateNewNames() {
            const prefix = prefixInput.value || '';
            const postfix = postfixInput.value || '';
            const zeroPadding = parseInt(zeroPaddingInput.value);
            const sortOrder = sortOrderSelect.value;
            const startNumber = parseInt(startNumberInput.value);
            
            // Sort files based on current filenames
            let sortedData = [...imageData];
            sortedData.sort((a, b) => {
                const comparison = a.filename.localeCompare(b.filename);
                return sortOrder === 'desc' ? -comparison : comparison;
            });
            
            // Generate new names
            const newNames = [];
            sortedData.forEach((img, index) => {
                const number = startNumber + index;
                const paddedNumber = number.toString().padStart(zeroPadding, '0');
                const newName = prefix + paddedNumber + postfix + img.extension;
                newNames.push({
                    originalIndex: img.index,
                    oldName: img.filename,
                    newName: newName
                });
            });
            
            return newNames;
        }
        
        function updatePreview() {
            const newNames = generateNewNames();
            
            // Update display
            newNames.forEach(item => {
                const element = document.querySelector(\`[data-index="\${item.originalIndex}"]\`);
                if (element) {
                    element.textContent = item.newName;
                }
            });
        }
        
        function executeRename() {
            console.log('Execute rename button clicked');
            const newNames = generateNewNames();
            console.log('Generated new names:', newNames);
            
            // Check for duplicate names
            const nameSet = new Set();
            const duplicates = [];
            
            for (const item of newNames) {
                if (nameSet.has(item.newName)) {
                    duplicates.push(item.newName);
                } else {
                    nameSet.add(item.newName);
                }
            }
            
            if (duplicates.length > 0) {
                console.log('Duplicate names detected:', duplicates);
                vscode.postMessage({
                    command: 'alert',
                    text: \`Duplicate names detected: \${duplicates.join(', ')}\`
                });
                return;
            }
            
            // Send rename request with confirmation
            console.log('Sending rename request to extension');
            vscode.postMessage({
                command: 'executeRename',
                renameList: newNames,
                confirmMessage: \`Are you sure you want to rename \${newNames.length} files?\`
            });
        }
        
        // Event handlers
        executeButton.addEventListener('click', executeRename);
        
        // Auto-update preview when settings change
        prefixInput.addEventListener('input', updatePreview);
        postfixInput.addEventListener('input', updatePreview);
        zeroPaddingInput.addEventListener('input', updatePreview);
        sortOrderSelect.addEventListener('change', updatePreview);
        startNumberInput.addEventListener('input', updatePreview);
        
        // Initial preview
        updatePreview();
    </script>
</body>
</html>`;
}

export function deactivate() {}