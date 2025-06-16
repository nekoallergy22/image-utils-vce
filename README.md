# Image Utils

A powerful VS Code extension for image comparison and preview utilities.

## Features

### 🔍 Image Comparison
Compare images from two directories side by side with an intuitive interface.

- Select two folders in VS Code Explorer
- Right-click → "Compare Images"
- Navigate through matching images with slider or arrow keys
- **Auto Slideshow**: Play/pause with customizable speed (0.1s - 2s intervals)
- **Consistent Sizing**: Images display at equal sizes regardless of VS Code zoom level
- View full directory paths for context

### 📸 Image Preview
Browse and preview images from a single directory with multiple view modes.

- Select one folder in VS Code Explorer  
- Right-click → "Preview Images"
- **Grid View**: Thumbnail grid layout for quick browsing
- **List View**: Detailed list with filenames and resolutions
- Click any image for full-screen viewing

### 🏷️ Batch Rename Images
Rename multiple images in a directory with sequential numbering and custom prefixes/postfixes.

- Select one folder in VS Code Explorer
- Right-click → "Rename Images"
- **Sequential Naming**: Automatic numbering (e.g., 00001.png, 00002.png)
- **Custom Prefix**: Add text before numbers (e.g., IMG_00001.png)
- **Custom Postfix**: Add text after numbers (e.g., 00001_final.png)
- **Zero Padding**: Configurable padding (1-10 digits)
- **Sort Options**: Ascending or descending order
- **Preview**: Real-time preview of new filenames before execution

### 🔎 Advanced Viewing
Enhanced full-screen image viewer with zoom and pan capabilities.

- **Mouse Drag Zoom**: Drag vertically to zoom in/out
- **Mouse Drag Pan**: Drag horizontally to move around (when zoomed)
- **Mouse Wheel**: Alternative zoom control
- **Keyboard Navigation**: Arrow keys to navigate between images
- **ESC to Exit**: Quick exit from full-screen mode

### 🎬 Slideshow Controls
Advanced slideshow functionality for image comparison.

- **Play/Pause Button**: Icon-only button with visual feedback (red when paused)
- **Speed Selection**: Choose from 0.1s, 0.5s, 1s, or 2s intervals
- **Keyboard Control**: Spacebar to toggle play/pause
- **Auto-stop**: Reaches end of images or manual navigation

## Usage

### Image Comparison
1. In VS Code Explorer, hold Ctrl/Cmd and select two folders
2. Right-click on one of the selected folders
3. Choose "Compare Images" from the context menu
4. Use the slider, arrow keys, or slideshow controls to navigate through matching images

#### Slideshow Controls
- **Play Button (▶)**: Start automatic slideshow
- **Pause Button (⏸)**: Stop slideshow (button turns red when paused)
- **Speed Dropdown**: Select interval: 0.1s, 0.5s, 1s, or 2s
- **Spacebar**: Toggle play/pause
- **Manual Navigation**: Arrow keys or slider (auto-stops slideshow)

### Image Preview
1. In VS Code Explorer, select a single folder containing images
2. Right-click on the folder
3. Choose "Preview Images" from the context menu
4. Switch between Grid View and List View using the toggle buttons
5. Click any image to view it in full-screen mode

### Full-Screen Controls
- **Zoom**: Drag mouse vertically or use mouse wheel
- **Pan**: Drag mouse horizontally (when zoomed in)
- **Navigate**: Use arrow keys or Previous/Next buttons
- **Exit**: Press ESC or click background

### Slideshow Controls (Image Comparison)
- **▶ Button**: Start slideshow (button background turns red when active)
- **Speed Selector**: Choose playback speed from dropdown
- **Spacebar**: Quick toggle play/pause
- **Arrow Keys**: Manual navigation (auto-stops slideshow)

## Supported Image Formats
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- BMP (.bmp)
- WebP (.webp)

## Information Display
- **Directory Path**: Full path to the selected directory/directories
- **Image Count**: Total number of images in the directory
- **Resolution**: Individual image dimensions (in List View)
- **Current Position**: Image counter (e.g., "5 / 20")
- **Slideshow Speed**: Current playback interval displayed in dropdown

## Requirements
- VS Code 1.74.0 or higher

## Installation
1. Download the `.vsix` file
2. In VS Code, go to Extensions view (Ctrl+Shift+X)
3. Click "..." menu → "Install from VSIX..."
4. Select the downloaded `.vsix` file

## Command Palette
You can also access features via Command Palette (Ctrl+Shift+P):
- `Image Utils: Compare Images`
- `Image Utils: Preview Images`
- `Image Utils: Rename Images`

## Version History
- **v0.0.4**: Added batch image rename functionality with sequential naming, prefix/postfix support, and enhanced UI with unified navigation controls
- **v0.0.3**: Added slideshow functionality with play/pause controls, speed selection, and improved image sizing consistency
- **v0.0.2**: Added image preview functionality with grid/list views and zoom capabilities  
- **v0.0.1**: Initial release with image comparison feature

## License
This extension is provided as-is for educational and personal use.